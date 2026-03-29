const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hasText = (value?: string | null) => Boolean(value && value.trim());

export const toDisplayCode = (value: string | null | undefined, fallback: string): string => {
  if (!hasText(value)) return fallback;
  const normalized = String(value).trim();
  if (UUID_PATTERN.test(normalized)) return fallback;
  return normalized;
};

export const resolveDetailRouteKey = (code?: string | null, id?: string | null): string => {
  if (hasText(code)) return String(code).trim();
  if (hasText(id)) return String(id).trim();
  return '';
};
