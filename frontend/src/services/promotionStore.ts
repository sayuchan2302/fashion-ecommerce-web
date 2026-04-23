/**
 * promotionStore.ts - Shared source of truth for promotions/vouchers.
 *
 * Both AdminPromotions (admin management) and couponService (client checkout)
 * read/write from this store, ensuring they are always in sync.
 */

export type DiscountType = 'percent' | 'fixed';
export type PromotionStatus = 'running' | 'paused' | 'expired';

export interface Promotion {
  id: string;
  name: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number;
  minOrderValue: number;
  userLimit: number;
  totalIssued: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
}

// Initial seed data (unified, previously split between couponService and AdminPromotions)
const INITIAL_PROMOTIONS: Promotion[] = [];

// In-memory store
let _rows: Promotion[] = [...INITIAL_PROMOTIONS];

// Derived status logic
export const derivePromotionStatus = (p: Promotion): PromotionStatus => {
  if (p.status === 'paused') return 'paused';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(p.startDate);
  const end = new Date(p.endDate);
  if (!Number.isNaN(end.getTime())) {
    end.setHours(0, 0, 0, 0);
    if (end < today) return 'expired';
  }
  if (!Number.isNaN(start.getTime())) {
    start.setHours(0, 0, 0, 0);
    if (start > today) return 'paused';
  }
  return 'running';
};

// Store API
export const promotionStore = {
  /** Returns all promotions with derived status applied */
  getAll(): Promotion[] {
    return _rows.map((p) => ({ ...p, status: derivePromotionStatus(p) }));
  },

  /** Returns promotions that are currently running and have stock remaining */
  getActive(): Promotion[] {
    return this.getAll().filter(
      (p) => p.status === 'running' && p.usedCount < p.totalIssued,
    );
  },

  /** Get a single promotion by code (case-insensitive) */
  getByCode(code: string): Promotion | undefined {
    const normalized = code.trim().toUpperCase();
    const row = _rows.find((p) => p.code.toUpperCase() === normalized);
    if (!row) return undefined;
    return { ...row, status: derivePromotionStatus(row) };
  },

  /** Replace the whole list (used by AdminPromotions after edits) */
  setAll(rows: Promotion[]) {
    _rows = rows.map((p) => ({ ...p }));
  },

  /** Add a new promotion */
  add(promotion: Promotion) {
    _rows = [promotion, ..._rows];
  },

  /** Update an existing promotion by id */
  update(updated: Promotion) {
    _rows = _rows.map((p) => (p.id === updated.id ? { ...updated } : p));
  },

  /** Remove a promotion by id */
  remove(id: string) {
    _rows = _rows.filter((p) => p.id !== id);
  },

  /** Increment usedCount after a successful redemption */
  recordUsage(code: string) {
    const normalized = code.trim().toUpperCase();
    _rows = _rows.map((p) =>
      p.code.toUpperCase() === normalized
        ? { ...p, usedCount: Math.min(p.usedCount + 1, p.totalIssued) }
        : p,
    );
  },
};

