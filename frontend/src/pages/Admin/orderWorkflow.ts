export type FulfillmentStatus = 'pending' | 'packing' | 'shipping' | 'done' | 'canceled';

export type PaymentStatus = 'paid' | 'unpaid' | 'cod_uncollected' | 'refund_pending' | 'refunded';

export const fulfillmentTransitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  pending: ['packing', 'canceled'],
  packing: ['shipping', 'canceled'],
  shipping: ['done'],
  done: [],
  canceled: [],
};

export const fulfillmentLabel = (state: FulfillmentStatus) => {
  if (state === 'pending') return 'Chờ xác nhận';
  if (state === 'packing') return 'Đang đóng gói';
  if (state === 'shipping') return 'Đang giao';
  if (state === 'done') return 'Hoàn tất';
  return 'Đã hủy';
};

export const shipLabel = (state: FulfillmentStatus) => {
  if (state === 'pending') return 'Chờ xác nhận';
  if (state === 'packing') return 'Đang đóng gói';
  if (state === 'shipping') return 'Đang giao';
  if (state === 'done') return 'Đã giao';
  return 'Đã hủy';
};

export const paymentLabel = (state: PaymentStatus) => {
  if (state === 'paid') return 'Đã thanh toán';
  if (state === 'unpaid') return 'Chưa thanh toán';
  if (state === 'cod_uncollected') return 'COD chưa thu';
  if (state === 'refund_pending') return 'Đang hoàn tiền';
  return 'Đã hoàn tiền';
};

export const canTransitionFulfillment = (
  current: FulfillmentStatus,
  next: FulfillmentStatus,
  paymentStatus: PaymentStatus,
) => {
  if (current === next) return true;
  if (!fulfillmentTransitions[current].includes(next)) return false;
  if (next === 'done' && paymentStatus !== 'paid' && paymentStatus !== 'cod_uncollected') return false;
  return true;
};
