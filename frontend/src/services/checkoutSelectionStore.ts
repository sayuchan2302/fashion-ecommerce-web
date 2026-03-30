const CHECKOUT_SELECTION_KEY = 'coolmate_checkout_selected_cart_ids_v1';

const isBrowser = () => typeof window !== 'undefined';

export const getSelectedCartIdsForCheckout = (): string[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_SELECTION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const setSelectedCartIdsForCheckout = (cartIds: string[]) => {
  if (!isBrowser()) return;
  try {
    const cleaned = Array.from(new Set(cartIds.map((value) => value.trim()).filter(Boolean)));
    if (cleaned.length === 0) {
      window.sessionStorage.removeItem(CHECKOUT_SELECTION_KEY);
      return;
    }
    window.sessionStorage.setItem(CHECKOUT_SELECTION_KEY, JSON.stringify(cleaned));
  } catch {
    // noop
  }
};

export const clearSelectedCartIdsForCheckout = () => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_SELECTION_KEY);
  } catch {
    // noop
  }
};
