import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight, Package, Truck, CheckCircle2, XCircle, Clock,
  MapPin, Phone, CreditCard, ArrowLeft, RotateCcw, Copy
} from 'lucide-react';
import './OrderDetail.css';

interface OrderItem {
  name: string;
  variant: string;
  qty: number;
  price: number;
  image: string;
}

interface TimelineStep {
  label: string;
  time: string;
  done: boolean;
  icon: React.ReactNode;
}

interface OrderData {
  id: string;
  date: string;
  status: 'delivered' | 'shipping' | 'processing' | 'cancelled';
  statusText: string;
  paymentMethod: string;
  shippingAddress: { name: string; phone: string; address: string };
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  timeline: TimelineStep[];
  trackingCode?: string;
}

const MOCK_ORDERS: Record<string, OrderData> = {
  'CM20260301': {
    id: 'CM20260301',
    date: '01/03/2026, 14:32',
    status: 'delivered',
    statusText: 'Đã giao',
    paymentMethod: 'Thanh toán khi nhận hàng (COD)',
    shippingAddress: { name: 'Ngọc Thịnh Nguyễn', phone: '0382253049', address: 'Q7F, Quốc lộ 37, Thị trấn Hùng Sơn, Huyện Đại Từ, Thái Nguyên' },
    items: [
      { name: 'Áo Thun Nam Cổ Tròn Cotton', variant: 'Trắng | Size: L', qty: 2, price: 299000, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=120&h=120&fit=crop' },
      { name: 'Quần Jeans Nam Slim Fit', variant: 'Xanh đậm | Size: 32', qty: 1, price: 459000, image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=120&h=120&fit=crop' },
    ],
    subtotal: 1057000, shippingFee: 0, discount: 0, total: 1057000,
    timeline: [
      { label: 'Đặt hàng thành công', time: '01/03 14:32', done: true, icon: <Clock size={16} /> },
      { label: 'Đã xác nhận', time: '01/03 15:00', done: true, icon: <CheckCircle2 size={16} /> },
      { label: 'Đang vận chuyển', time: '02/03 09:15', done: true, icon: <Truck size={16} /> },
      { label: 'Đã giao hàng', time: '04/03 16:40', done: true, icon: <Package size={16} /> },
    ],
    trackingCode: 'GHN20260301VN',
  },
  'CM20260312': {
    id: 'CM20260312',
    date: '12/03/2026, 10:15',
    status: 'shipping',
    statusText: 'Đang giao',
    paymentMethod: 'VNPAY / ThaiQR',
    shippingAddress: { name: 'Ngọc Thịnh Nguyễn', phone: '0382253049', address: 'Q7F, Quốc lộ 37, Thị trấn Hùng Sơn, Huyện Đại Từ, Thái Nguyên' },
    items: [
      { name: 'Áo Polo Nam Excool', variant: 'Xanh navy | Size: XL', qty: 1, price: 389000, image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=120&h=120&fit=crop' },
    ],
    subtotal: 389000, shippingFee: 0, discount: 0, total: 389000,
    timeline: [
      { label: 'Đặt hàng thành công', time: '12/03 10:15', done: true, icon: <Clock size={16} /> },
      { label: 'Đã xác nhận', time: '12/03 10:45', done: true, icon: <CheckCircle2 size={16} /> },
      { label: 'Đang vận chuyển', time: '13/03 08:00', done: true, icon: <Truck size={16} /> },
      { label: 'Đã giao hàng', time: '', done: false, icon: <Package size={16} /> },
    ],
    trackingCode: 'GHTK20260312VN',
  },
  'CM20260220': {
    id: 'CM20260220',
    date: '20/02/2026, 20:05',
    status: 'cancelled',
    statusText: 'Đã hủy',
    paymentMethod: 'MoMo',
    shippingAddress: { name: 'Thịnh Nguyễn', phone: '0987654321', address: 'Số 15, Đường Lê Lợi, Phường Bến Nghé, Quận 1, Hồ Chí Minh' },
    items: [
      { name: 'Áo Hoodie Oversize Unisex', variant: 'Đen | Size: M', qty: 1, price: 549000, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=120&h=120&fit=crop' },
    ],
    subtotal: 549000, shippingFee: 30000, discount: 0, total: 579000,
    timeline: [
      { label: 'Đặt hàng thành công', time: '20/02 20:05', done: true, icon: <Clock size={16} /> },
      { label: 'Đã hủy bởi khách hàng', time: '20/02 21:30', done: true, icon: <XCircle size={16} /> },
    ],
  },
};

const formatPrice = (price: number) =>
  price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';

const statusColorMap: Record<string, string> = {
  delivered: 'status-delivered',
  shipping: 'status-shipping',
  processing: 'status-processing',
  cancelled: 'status-cancelled',
};

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const order = id ? MOCK_ORDERS[id] : null;

  if (!order) {
    return (
      <div className="od-page">
        <div className="od-container">
          <div className="od-not-found">
            <Package size={64} strokeWidth={1} />
            <h2>Không tìm thấy đơn hàng</h2>
            <p>Đơn hàng #{id} không tồn tại hoặc đã bị xoá.</p>
            <Link to="/profile" className="od-back-link">Quay lại lịch sử đơn hàng</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCopyTracking = () => {
    if (order.trackingCode) {
      navigator.clipboard.writeText(order.trackingCode);
      alert('Đã sao chép mã vận đơn!');
    }
  };

  return (
    <div className="od-page">
      <div className="od-container">
        {/* Breadcrumb */}
        <div className="od-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <Link to="/profile">Tài khoản</Link>
          <ChevronRight size={14} />
          <span>Đơn hàng #{order.id}</span>
        </div>

        {/* Header */}
        <div className="od-header">
          <Link to="/profile" className="od-back-btn">
            <ArrowLeft size={18} /> Quay lại
          </Link>
          <div className="od-header-info">
            <h1>Đơn hàng <span className="od-order-id">#{order.id}</span></h1>
            <span className="od-date">Ngày đặt: {order.date}</span>
          </div>
          <span className={`od-status-badge ${statusColorMap[order.status]}`}>{order.statusText}</span>
        </div>

        <div className="od-grid">
          {/* Left Column */}
          <div className="od-left">
            {/* Timeline */}
            <div className="od-card">
              <h3 className="od-card-title">Trạng thái đơn hàng</h3>
              <div className="od-timeline">
                {order.timeline.map((step, idx) => (
                  <div key={idx} className={`od-tl-step ${step.done ? 'done' : ''} ${idx === order.timeline.length - 1 && step.done ? 'last-done' : ''}`}>
                    <div className="od-tl-dot">{step.icon}</div>
                    <div className="od-tl-content">
                      <span className="od-tl-label">{step.label}</span>
                      {step.time && <span className="od-tl-time">{step.time}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {order.trackingCode && (
                <div className="od-tracking">
                  <span className="od-tracking-label">Mã vận đơn:</span>
                  <code className="od-tracking-code">{order.trackingCode}</code>
                  <button className="od-tracking-copy" onClick={handleCopyTracking}><Copy size={14} /> Sao chép</button>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="od-card">
              <h3 className="od-card-title">Sản phẩm ({order.items.length})</h3>
              <div className="od-items">
                {order.items.map((item, idx) => (
                  <div key={idx} className="od-item">
                    <img src={item.image} alt={item.name} className="od-item-img" />
                    <div className="od-item-info">
                      <p className="od-item-name">{item.name}</p>
                      <p className="od-item-variant">{item.variant}</p>
                      <p className="od-item-qty">x{item.qty}</p>
                    </div>
                    <span className="od-item-price">{formatPrice(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="od-right">
            {/* Shipping Info */}
            <div className="od-card">
              <h3 className="od-card-title"><MapPin size={16} /> Thông tin giao hàng</h3>
              <div className="od-info-block">
                <p className="od-info-name">{order.shippingAddress.name}</p>
                <p className="od-info-phone"><Phone size={14} /> {order.shippingAddress.phone}</p>
                <p className="od-info-address">{order.shippingAddress.address}</p>
              </div>
            </div>

            {/* Payment */}
            <div className="od-card">
              <h3 className="od-card-title"><CreditCard size={16} /> Phương thức thanh toán</h3>
              <p className="od-payment-method">{order.paymentMethod}</p>
            </div>

            {/* Summary */}
            <div className="od-card">
              <h3 className="od-card-title">Chi tiết thanh toán</h3>
              <div className="od-summary">
                <div className="od-sum-row">
                  <span>Tạm tính</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="od-sum-row">
                  <span>Phí vận chuyển</span>
                  <span>{order.shippingFee === 0 ? 'Miễn phí' : formatPrice(order.shippingFee)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="od-sum-row od-discount">
                    <span>Giảm giá</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="od-sum-row od-total-row">
                  <span>Tổng cộng</span>
                  <span className="od-total-price">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="od-card od-actions-card">
              {order.status === 'delivered' && (
                <>
                  <button className="od-action-btn od-btn-primary">Đánh giá sản phẩm</button>
                  <button className="od-action-btn od-btn-outline"><RotateCcw size={16} /> Đổi / trả hàng</button>
                </>
              )}
              {order.status === 'shipping' && (
                <button className="od-action-btn od-btn-primary">Xác nhận đã nhận hàng</button>
              )}
              {order.status === 'cancelled' && (
                <button className="od-action-btn od-btn-primary">Mua lại</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
