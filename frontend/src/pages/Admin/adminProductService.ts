import { apiRequest } from '../../services/apiClient';
import type { VariantRow } from './AdminVariantModal';

type ProductStatusType = 'active' | 'low' | 'out';

type InventorySource = 'manual_adjustment' | 'variant_sync' | 'bulk_action';

export interface InventoryMovement {
  id: string;
  at: string;
  actor: string;
  source: InventorySource;
  reason: string;
  delta: number;
  beforeStock: number;
  afterStock: number;
}

export interface AdminProductRecord {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  variants: string;
  thumb: string;
  statusType: ProductStatusType;
  variantMatrix: VariantRow[];
  inventoryLedger: InventoryMovement[];
  version: number;
  updatedAt: string;
}

type ProductListener = () => void;
const listeners = new Set<ProductListener>();
let cachedAdminProducts: AdminProductRecord[] = [];

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeAdminProducts = (listener: ProductListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const listAdminProducts = async (): Promise<AdminProductRecord[]> => {
  try {
    const data = await apiRequest<{ content?: AdminProductRecord[] }>('/api/admin/products?size=100', {}, { auth: true });
    const rows = Array.isArray(data?.content) ? data.content : [];
    cachedAdminProducts = rows;
    return rows;
  } catch (error) {
    console.error('Failed to list admin products:', error);
    return cachedAdminProducts;
  }
};

export const listAdminProductsSnapshot = (): AdminProductRecord[] => cachedAdminProducts;

export const getProductBySku = async (sku: string): Promise<AdminProductRecord | undefined> => {
  try {
    return await apiRequest<AdminProductRecord>(`/api/admin/products/${sku}`, {}, { auth: true });
  } catch (error) {
    console.error('Failed to get product by sku:', error);
    return undefined;
  }
};

export const getProductVariantMatrix = async (sku: string): Promise<VariantRow[]> => {
  const product = await getProductBySku(sku);
  return product?.variantMatrix || [];
};

export const getProductInventoryLedger = async (sku: string, limit = 5): Promise<InventoryMovement[]> => {
  const product = await getProductBySku(sku);
  if (!product) return [];
  return product.inventoryLedger.slice(0, limit);
};

export const updateProductPrice = async (sku: string, adjust: number): Promise<{ ok: boolean; error?: string }> => {
  try {
    await apiRequest(`/api/admin/products/${sku}/price`, {
      method: 'PUT',
      body: JSON.stringify({ price: adjust }),
    }, { auth: true });
    notifyListeners();
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: toErrorMessage(error, 'Cannot update product price right now.') };
  }
};

export const applyVariantMatrix = async (sku: string, matrix: VariantRow[]): Promise<{ ok: boolean; error?: string }> => {
  return {
    ok: false,
    error: `Cannot sync variant matrix for SKU ${sku}. API support is not available yet (${matrix.length} rows).`,
  };
};

export const adjustProductStock = async (params: {
  sku: string;
  nextStock: number;
  actor: string;
  reason: string;
  source: InventorySource;
}): Promise<{ ok: boolean; error?: string }> => {
  try {
    const product = await getProductBySku(params.sku);
    if (!product) return { ok: false, error: 'Product does not exist.' };

    await apiRequest('/api/admin/products/adjust-stock', {
      method: 'POST',
      body: JSON.stringify({
        sku: params.sku,
        before: product.stock,
        after: params.nextStock,
        suggestedReason: params.reason,
      }),
    }, { auth: true });

    notifyListeners();
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: toErrorMessage(error, 'Cannot update product stock right now.') };
  }
};
