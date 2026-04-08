const PENDING_VNPAY_CHECKOUT_KEY = 'pendingVnpayCheckout';

export interface PendingVnpayCheckout {
  orderCode: string;
  cartIds: string[];
  createdAt: number;
}

const isBrowser = () => typeof window !== 'undefined';

export const getPendingVnpayCheckout = (): PendingVnpayCheckout | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PENDING_VNPAY_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingVnpayCheckout;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.orderCode || !Array.isArray(parsed.cartIds)) return null;
    return {
      orderCode: String(parsed.orderCode),
      cartIds: parsed.cartIds
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
      createdAt: Number(parsed.createdAt) || Date.now(),
    };
  } catch {
    return null;
  }
};

export const setPendingVnpayCheckout = (payload: PendingVnpayCheckout) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PENDING_VNPAY_CHECKOUT_KEY, JSON.stringify(payload));
  } catch {
    // noop
  }
};

export const clearPendingVnpayCheckout = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PENDING_VNPAY_CHECKOUT_KEY);
  } catch {
    // noop
  }
};
