import './Admin.css';
import { useParams } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { Printer, XCircle, RotateCcw, Truck, User, Copy } from 'lucide-react';

const mockOrder = {
  code: 'ORD-10234',
  status: 'Đang giao',
  payStatus: 'Đã thanh toán',
  shipStatus: 'Đang giao',
  shipMethod: 'GHN - Giao nhanh',
  tracking: 'GHN123456789',
  customer: {
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
    discount: 50000,
    voucher: 'WELCOME50',
  },
  timeline: [
    { time: '10:30 19/03/2026', text: 'Khách hàng đặt hàng thành công.', tone: 'success' },
    { time: '11:00 19/03/2026', text: 'Admin (Nguyễn Văn A) đã xác nhận đơn hàng.', tone: 'success' },
    { time: '14:00 19/03/2026', text: 'Đã bàn giao cho đơn vị vận chuyển GHTK.', tone: 'pending' },
  ],
};

const formatVND = (n: number) => n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const AdminOrderDetail = () => {
  const { id } = useParams();
  const order = mockOrder; // would fetch by id
  const total = order.pricing.subtotal + order.pricing.shipping - order.pricing.discount;

  return (
    <AdminLayout
      title={
        <div className="od-title-row">
          <button className="admin-ghost-btn" onClick={() => window.history.back()} aria-label="Quay lại">←</button>
          <span>Đơn hàng #{id || order.code}</span>
        </div>
      }
      actions={(
        <div className="admin-actions">
          <div className="admin-status-group">
            <label className="admin-label">Current Status</label>
            <select className="admin-select">
              <option>Chờ xác nhận</option>
              <option>Đang đóng gói</option>
              <option selected>Đang giao</option>
              <option>Hoàn tất</option>
              <option>Đã hủy</option>
            </select>
          </div>
          <button className="admin-primary-btn dark"><Printer size={16} /> In hóa đơn</button>
          <button className="admin-ghost-btn"><RotateCcw size={16} /> Hoàn tiền</button>
          <button className="admin-ghost-btn danger"><XCircle size={16} /> Hủy đơn</button>
        </div>
      )}
    >
      <div className="order-detail-grid">
        <div className="od-left">
          <section className="od-section">
            <div className="od-section-head">
              <h2>Order Items</h2>
            </div>
            <div className="od-items">
              {order.items.map(item => (
                <div key={item.id} className="od-item">
                  <img src={item.image} alt={item.name} />
                  <div className="od-item-info">
                    <p className="od-item-name">{item.name}</p>
                    <p className="od-item-variant"><strong>{item.color}</strong> · <strong>Size {item.size}</strong></p>
                    <p className="od-item-price">{item.qty} x {formatVND(item.price)}</p>
                  </div>
                  <div className="od-item-total">{formatVND(item.qty * item.price)}</div>
                </div>
              ))}
            </div>
            <div className="od-summary">
              <div className="od-summary-row"><span>Tạm tính</span><strong>{formatVND(order.pricing.subtotal)}</strong></div>
              <div className="od-summary-row"><span>Phí vận chuyển</span><strong>{formatVND(order.pricing.shipping)}</strong></div>
              <div className="od-summary-row"><span>Giảm giá {order.pricing.voucher && `(${order.pricing.voucher})`}</span><strong>-{formatVND(order.pricing.discount)}</strong></div>
              <div className="od-summary-row od-total"><span>Tổng thanh toán</span><strong>{formatVND(total)}</strong></div>
            </div>
          </section>

          <section className="od-section">
            <div className="od-section-head">
              <h2>Payment Details</h2>
            </div>
            <div className="od-card">
              <div className="od-card-row"><span className="od-label">Payment Method</span><strong>{order.paymentMethod}</strong></div>
              <div className="od-card-row"><span className="od-label">Thanh toán</span><span className="admin-pill success">{order.payStatus}</span></div>
              <div className="od-card-row"><span className="od-label">Vận chuyển</span><span className="admin-pill pending"><Truck size={14} /> {order.shipStatus}</span></div>
              <div className="od-card-row tracking-row">
                <span className="od-label">Tracking</span>
                <div className="tracking-value">
                  <strong>{order.tracking}</strong>
                  <button className="admin-icon-btn" aria-label="Copy tracking" onClick={() => navigator.clipboard?.writeText(order.tracking)}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="od-right">
          <section className="od-section">
            <div className="od-section-head">
              <h2>Customer & Shipping</h2>
            </div>
            <div className="od-card">
              <div className="od-card-row"><span className="od-label">Customer</span><strong>{order.customer.name}</strong></div>
              <div className="od-card-row"><span className="od-label">Phone</span><strong>{order.customer.phone}</strong></div>
              <div className="od-card-row"><span className="od-label">Email</span><span>{order.customer.email}</span></div>
              <div className="od-card-row"><span className="od-label">Address</span><span>{order.address}</span></div>
              <div className="od-card-row"><span className="od-label">Shipper</span><span>{order.shipMethod}</span></div>
              <div className="od-note">Guest note: {order.note}</div>
            </div>
          </section>

          <section className="od-section">
            <div className="od-section-head">
              <h2>Order Timeline</h2>
            </div>
            <div className="od-timeline">
              {order.timeline.map((log, idx) => (
                <div key={idx} className="od-timeline-item">
                  <div className={`od-timeline-dot ${log.tone || 'neutral'}`} />
                  <div>
                    <p className="od-timeline-time">{log.time}</p>
                    <p className="od-timeline-text">
                      <User size={14} /> {log.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrderDetail;
