const VIETNAMESE_MOBILE_PATTERN = /^0(?:3|5|7|8|9)\d{8}$/;

export const normalizeVietnamesePhone = (value: string): string => {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (!compact) {
    return '';
  }

  let normalized = compact;
  if (normalized.startsWith('+84')) {
    normalized = `0${normalized.slice(3)}`;
  } else if (normalized.startsWith('0084')) {
    normalized = `0${normalized.slice(4)}`;
  } else if (normalized.startsWith('84')) {
    normalized = `0${normalized.slice(2)}`;
  }

  return normalized.replace(/\D/g, '');
};

export const isValidVietnamesePhone = (value: string): boolean =>
  VIETNAMESE_MOBILE_PATTERN.test(normalizeVietnamesePhone(value));
