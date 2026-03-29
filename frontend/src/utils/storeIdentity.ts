const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isCanonicalStoreSlug = (value?: string | null): value is string => {
  if (!value) {
    return false;
  }
  const normalized = value.trim();
  return normalized.length > 0 && !UUID_PATTERN.test(normalized);
};

export const normalizeStoreSlug = (value?: string | null): string | undefined => {
  if (!isCanonicalStoreSlug(value)) {
    return undefined;
  }
  return value.trim();
};
