import { Link } from 'react-router-dom';
import './Account.css';
import { orderService } from '../../services/orderService';
import type { Order } from '../../types';

const statusText: Record<Order['status'], string> = {
  pending: 'Chờ xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
  refunded: 'Đã hoàn tiền',
};

const OrdersPage = () => {
  const orders = orderService.list();

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1 className="account-title">Đơn hàng của tôi</h1>
        </div>
        <p className="account-subtitle">Xem lịch sử đặt hàng và theo dõi trạng thái.</p>

        <div className="order-list">
          {orders.map(order => (
            <div className="order-card" key={order.id}>
              <div className="order-status">
                <span className="status-pill">{statusText[order.status]}</span>
              </div>
              <div><strong>Mã đơn:</strong> {order.id}</div>
              <div><strong>Ngày đặt:</strong> {new Date(order.createdAt).toLocaleString('vi-VN')}</div>
              <div><strong>Tổng tiền:</strong> {order.total.toLocaleString('vi-VN')}đ</div>
              <div className="order-items-small">{order.items.length} sản phẩm</div>
              <Link to={`/account/orders/${order.id}`} className="btn-secondary" style={{ textAlign: 'center' }}>Xem chi tiết</Link>
            </div>
          ))}
          {orders.length === 0 && <div className="account-meta">Chưa có đơn hàng nào.</div>}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
