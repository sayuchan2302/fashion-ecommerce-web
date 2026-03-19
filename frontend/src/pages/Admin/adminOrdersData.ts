import type { FulfillmentStatus, PaymentStatus } from './orderWorkflow';

export interface AdminOrderItem {
  id: number;
  name: string;
  color: string;
  size: string;
  qty: number;
  price: number;
  image: string;
}

export interface AdminOrderPricing {
  subtotal: number;
  shipping: number;
  discount: number;
  voucher: string;
}

export interface AdminOrderTimelineEntry {
  time: string;
  text: string;
  tone: 'success' | 'pending' | 'error' | 'neutral';
}

export interface AdminOrderData {
  code: string;
  customer: string;
  avatar: string;
  total: string;
  paymentStatus: PaymentStatus;
  fulfillment: FulfillmentStatus;
  shipMethod: string;
  tracking: string;
  date: string;
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  address: string;
  note: string;
  paymentMethod: string;
  items: AdminOrderItem[];
  pricing: AdminOrderPricing;
  timeline: AdminOrderTimelineEntry[];
}

export const adminOrdersData: AdminOrderData[] = [
  {
    code: 'ORD-10235',
    customer: 'Đỗ Gia Linh',
    avatar: 'https://ui-avatars.com/api/?name=Do+Gia+Linh&background=22C55E&color=fff',
    total: '980.000 đ',
    paymentStatus: 'cod_uncollected',
    fulfillment: 'pending',
    shipMethod: 'GHN - Giao tiêu chuẩn',
    tracking: 'GHN10235VN',
    date: '2026-03-10T11:12:00',
    customerInfo: {
      name: 'Đỗ Gia Linh',
      phone: '0913 668 899',
      email: 'dogialinh@example.com',
    },
    address: '25 Trần Quang Khải, Quận 1, TP.HCM',
    note: 'Nhận hàng sau 18h, hỗ trợ gọi trước khi giao.',
    paymentMethod: 'COD',
    items: [
      { id: 1, name: 'Áo Polo Coolmax', color: 'Navy', size: 'L', qty: 1, price: 399000, image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=200&h=260&q=80' },
      { id: 2, name: 'Quần Kaki Slim', color: 'Be', size: '32', qty: 1, price: 499000, image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=200&h=260&q=80' },
    ],
    pricing: {
      subtotal: 898000,
      shipping: 30000,
      discount: 0,
      voucher: '',
    },
    timeline: [
      { time: '11:12 10/03/2026', text: 'Khách đặt hàng thành công.', tone: 'success' },
      { time: '11:15 10/03/2026', text: 'Hệ thống ghi nhận đơn COD chờ xác nhận.', tone: 'pending' },
    ],
  },
  {
    code: 'ORD-10234',
    customer: 'Nguyễn Văn A',
    avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=0D8ABC&color=fff',
    total: '1.250.000 đ',
    paymentStatus: 'paid',
    fulfillment: 'shipping',
    shipMethod: 'GHN - Giao nhanh',
    tracking: 'GHN123456789',
    date: '2026-03-10T10:32:00',
    customerInfo: {
      name: 'Nguyễn Văn A',
      phone: '0901 234 567',
      email: 'nguyenvana@example.com',
    },
    address: 'Số 12, Ngõ 3, P. Trung Hòa, Q. Cầu Giấy, Hà Nội',
    note: 'Giao giờ hành chính, gọi trước 10 phút.',
    paymentMethod: 'VNPAY',
    items: [
      { id: 1, name: 'Áo Polo Cotton Khử Mùi', color: 'Đen', size: 'L', qty: 2, price: 359000, image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=200&h=260&q=80' },
      { id: 2, name: 'Quần Jeans Slim', color: 'Indigo', size: '32', qty: 1, price: 699000, image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=200&h=260&q=80' },
    ],
    pricing: {
      subtotal: 1417000,
      shipping: 30000,
      discount: 197000,
      voucher: 'WELCOME50',
    },
    timeline: [
      { time: '10:30 10/03/2026', text: 'Khách hàng đặt hàng thành công.', tone: 'success' },
      { time: '11:00 10/03/2026', text: 'Admin đã xác nhận đơn hàng.', tone: 'success' },
      { time: '14:00 10/03/2026', text: 'Đã bàn giao cho GHN.', tone: 'pending' },
    ],
  },
  {
    code: 'ORD-10233',
    customer: 'Trần Thu B',
    avatar: 'https://ui-avatars.com/api/?name=Tran+Thu+B&background=F59E0B&color=fff',
    total: '780.000 đ',
    paymentStatus: 'unpaid',
    fulfillment: 'packing',
    shipMethod: 'GHTK - Tiết kiệm',
    tracking: 'GHTK298174',
    date: '2026-03-10T09:05:00',
    customerInfo: {
      name: 'Trần Thu B',
      phone: '0988 223 995',
      email: 'tranthub@example.com',
    },
    address: '72 Lê Lợi, Hải Châu, Đà Nẵng',
    note: 'Cần xuất hóa đơn VAT.',
    paymentMethod: 'Chuyển khoản',
    items: [
      { id: 1, name: 'Áo Thun Basic', color: 'Trắng', size: 'M', qty: 2, price: 199000, image: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=200&h=260&q=80' },
      { id: 2, name: 'Áo Khoác Light', color: 'Đen', size: 'L', qty: 1, price: 450000, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=200&h=260&q=80' },
    ],
    pricing: {
      subtotal: 848000,
      shipping: 30000,
      discount: 98000,
      voucher: 'MARCH10',
    },
    timeline: [
      { time: '09:05 10/03/2026', text: 'Đơn hàng đã được tạo.', tone: 'success' },
      { time: '09:12 10/03/2026', text: 'Kho bắt đầu đóng gói đơn hàng.', tone: 'pending' },
    ],
  },
  {
    code: 'ORD-10232',
    customer: 'Lê Hữu C',
    avatar: 'https://ui-avatars.com/api/?name=Le+Huu+C&background=10B981&color=fff',
    total: '2.150.000 đ',
    paymentStatus: 'paid',
    fulfillment: 'done',
    shipMethod: 'ShopeeXpress',
    tracking: 'SPX8820911',
    date: '2026-03-09T17:45:00',
    customerInfo: {
      name: 'Lê Hữu C',
      phone: '0939 444 112',
      email: 'lehuuc@example.com',
    },
    address: '15 Hoàng Hoa Thám, Bình Thạnh, TP.HCM',
    note: 'Đã giao thành công, khách hài lòng sản phẩm.',
    paymentMethod: 'Momo',
    items: [
      { id: 1, name: 'Áo Polo Premium', color: 'Xanh đậm', size: 'L', qty: 2, price: 499000, image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=200&h=260&q=80' },
      { id: 2, name: 'Quần Jeans Slim', color: 'Xanh denim', size: '33', qty: 2, price: 699000, image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=200&h=260&q=80' },
    ],
    pricing: {
      subtotal: 2396000,
      shipping: 30000,
      discount: 276000,
      voucher: 'VIP12',
    },
    timeline: [
      { time: '08:00 08/03/2026', text: 'Khách đặt hàng.', tone: 'success' },
      { time: '08:20 08/03/2026', text: 'Đơn đã xác nhận và đóng gói.', tone: 'success' },
      { time: '14:00 08/03/2026', text: 'Bàn giao cho đơn vị vận chuyển.', tone: 'pending' },
      { time: '10:50 09/03/2026', text: 'Đã giao thành công cho khách.', tone: 'success' },
    ],
  },
  {
    code: 'ORD-10231',
    customer: 'Phạm Hương',
    avatar: 'https://ui-avatars.com/api/?name=Pham+Huong&background=6366F1&color=fff',
    total: '560.000 đ',
    paymentStatus: 'refund_pending',
    fulfillment: 'canceled',
    shipMethod: 'GHN - Giao nhanh',
    tracking: 'GHN998812',
    date: '2026-03-09T16:12:00',
    customerInfo: {
      name: 'Phạm Hương',
      phone: '0973 113 225',
      email: 'phamhuong@example.com',
    },
    address: '98 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    note: 'Khách yêu cầu hủy do đổi sang mẫu khác.',
    paymentMethod: 'VNPAY',
    items: [
      { id: 1, name: 'Áo Thun Basic', color: 'Đen', size: 'M', qty: 2, price: 199000, image: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=200&h=260&q=80' },
      { id: 2, name: 'Mũ lưỡi trai', color: 'Xám', size: 'Free', qty: 1, price: 162000, image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=200&h=260&q=80' },
    ],
    pricing: {
      subtotal: 560000,
      shipping: 30000,
      discount: 30000,
      voucher: 'CANCEL30',
    },
    timeline: [
      { time: '15:55 09/03/2026', text: 'Đơn được tạo thành công.', tone: 'success' },
      { time: '16:12 09/03/2026', text: 'Khách yêu cầu hủy đơn.', tone: 'error' },
      { time: '16:20 09/03/2026', text: 'Kế toán xử lý hoàn tiền.', tone: 'pending' },
    ],
  },
];
