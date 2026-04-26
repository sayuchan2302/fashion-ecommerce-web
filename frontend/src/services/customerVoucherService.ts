import { apiRequest } from './apiClient';
import type { Coupon } from './couponService';

type WalletStatus = 'AVAILABLE' | 'USED' | 'REVOKED';
type WalletDisplayStatus = 'AVAILABLE' | 'USED' | 'EXPIRED' | 'REVOKED';
type ClaimSource = 'ADMIN_AUTO' | 'FOLLOW_AUTO' | 'STORE_CLAIM';

interface BackendCustomerVoucher {
  id?: string;
  voucherId?: string;
  storeId?: string;
  storeName?: string;
  name?: string;
  code?: string;
  description?: string;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
  minOrderValue?: number;
  totalIssued?: number;
  usedCount?: number;
  endDate?: string;
  walletStatus?: WalletStatus;
  displayStatus?: WalletDisplayStatus;
  claimSource?: ClaimSource;
  claimedAt?: string;
  usedAt?: string;
}

interface BackendWalletListResponse {
  items?: BackendCustomerVoucher[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  pageSize?: number;
}

export interface CustomerWalletVoucher extends Coupon {
  customerVoucherId: string;
  voucherId?: string;
  name: string;
  walletStatus: WalletStatus;
  displayStatus: WalletDisplayStatus;
  claimSource?: ClaimSource;
  claimedAt?: string;
  usedAt?: string;
}

export interface CustomerWalletListResult {
  items: CustomerWalletVoucher[];
  totalElements: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

interface WalletListParams {
  status?: WalletStatus;
  page?: number;
  size?: number;
}

const normalizeCode = (value: string) => value.trim().replace(/\s+/g, '').toUpperCase();

const isExpired = (dateValue: string) => {
  if (!dateValue) return false;
  const expiry = new Date(`${dateValue}T23:59:59`);
  return Number.isFinite(expiry.getTime()) && expiry.getTime() < Date.now();
};

const toWalletVoucher = (row: BackendCustomerVoucher): CustomerWalletVoucher | null => {
  const customerVoucherId = String(row.id || '').trim();
  const code = normalizeCode(row.code || '');
  if (!customerVoucherId || !code) {
    return null;
  }

  const totalIssued = Math.max(0, Number(row.totalIssued || 0));
  const usedCount = Math.max(0, Number(row.usedCount || 0));

  return {
    customerVoucherId,
    voucherId: row.voucherId,
    id: row.voucherId,
    storeId: row.storeId,
    storeName: (row.storeName || '').trim() || undefined,
    name: (row.name || '').trim(),
    code,
    type: (row.discountType || '').toUpperCase() === 'FIXED' ? 'fixed' : 'percent',
    value: Number(row.discountValue || 0),
    minOrderValue: Number(row.minOrderValue || 0),
    expiresAt: row.endDate || '',
    description: (row.description || '').trim(),
    remaining: Math.max(0, totalIssued - usedCount),
    walletStatus: row.walletStatus || 'AVAILABLE',
    displayStatus: row.displayStatus || 'AVAILABLE',
    claimSource: row.claimSource,
    claimedAt: row.claimedAt,
    usedAt: row.usedAt,
  };
};

const sortByClaimedAtDesc = (left: CustomerWalletVoucher, right: CustomerWalletVoucher) =>
  new Date(right.claimedAt || 0).getTime() - new Date(left.claimedAt || 0).getTime();

const includesStore = (voucher: CustomerWalletVoucher, storeIds?: string[]) => {
  const normalizedStoreIds = new Set((storeIds || []).filter(Boolean));
  if (normalizedStoreIds.size === 0) return true;
  if (!voucher.storeId) return true;
  return normalizedStoreIds.has(voucher.storeId);
};

const isSelectableWalletVoucher = (voucher: CustomerWalletVoucher) =>
  voucher.displayStatus === 'AVAILABLE' && !isExpired(voucher.expiresAt);

export const customerVoucherService = {
  async listWallet(params: WalletListParams = {}): Promise<CustomerWalletListResult> {
    const page = Math.max(1, Number(params.page || 1));
    const size = Math.max(1, Number(params.size || 20));
    const searchParams = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (params.status) {
      searchParams.set('status', params.status);
    }

    const response = await apiRequest<BackendWalletListResponse>(
      `/api/vouchers/my-wallet?${searchParams.toString()}`,
      {},
      { auth: true },
    );

    const items = (response.items || [])
      .map(toWalletVoucher)
      .filter((voucher): voucher is CustomerWalletVoucher => Boolean(voucher));

    const totalPages = Math.max(1, Number(response.totalPages || 1));

    return {
      items,
      totalElements: Math.max(0, Number(response.totalElements || items.length)),
      totalPages,
      page: Math.min(Math.max(Number(response.page || page), 1), totalPages),
      pageSize: Math.max(1, Number(response.pageSize || size)),
    };
  },

  async listAllWallet(status?: WalletStatus): Promise<CustomerWalletVoucher[]> {
    let page = 1;
    let totalPages = 1;
    const rows: CustomerWalletVoucher[] = [];

    do {
      const result = await this.listWallet({ status, page, size: 100 });
      rows.push(...result.items);
      totalPages = Math.max(1, result.totalPages);
      page += 1;
    } while (page <= totalPages);

    return rows.sort(sortByClaimedAtDesc);
  },

  async getAvailableWalletCoupons(storeIds?: string[]): Promise<CustomerWalletVoucher[]> {
    const rows = await this.listAllWallet('AVAILABLE');
    return rows.filter((voucher) => includesStore(voucher, storeIds) && isSelectableWalletVoucher(voucher));
  },

  async getClaimedVoucherIdsByStore(storeId: string): Promise<Set<string>> {
    const normalizedStoreId = String(storeId || '').trim();
    if (!normalizedStoreId) return new Set<string>();

    const rows = await this.listAllWallet();
    const ids = rows
      .filter((voucher) => voucher.storeId === normalizedStoreId)
      .map((voucher) => voucher.id)
      .filter((voucherId): voucherId is string => Boolean(voucherId));
    return new Set(ids);
  },

  async claimVoucher(voucherId: string): Promise<CustomerWalletVoucher> {
    const normalizedVoucherId = String(voucherId || '').trim();
    if (!normalizedVoucherId) {
      throw new Error('Voucher ID is required');
    }

    const response = await apiRequest<BackendCustomerVoucher>(
      `/api/vouchers/${encodeURIComponent(normalizedVoucherId)}/claim`,
      { method: 'POST' },
      { auth: true },
    );

    const mapped = toWalletVoucher(response);
    if (!mapped) {
      throw new Error('Invalid voucher response');
    }
    return mapped;
  },
};
