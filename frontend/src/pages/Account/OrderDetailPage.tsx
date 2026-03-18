import { Link, useNavigate, useParams } from 'react-router-dom';
import './Account.css';
import { orderService } from '../../services/orderService';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const order = id ? orderService.getById(id) : null;
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (!order) {
    return (
      <div className="account-page">
        <div className="account-container">
          <h1 className="account-title">Không tìm thấy đơn hàng</h1>
          <Link to="/account/orders" className="btn-secondary">Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  const handleReorder = () => {
    order.items.forEach(item => {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.image,
        color: item.color || 'Mặc định',
        size: item.size || 'F',
      });
    });
    addToast('Đã thêm sản phẩm vào giỏ', 'success');
    navigate('/cart');
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <div>
            <h1 className="account-title">Đơn hàng {order.id}</h1>
            <p className="account-subtitle">Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
          </div>
          <div className="account-actions">
            <button className="btn-secondary" onClick={() => navigate('/account/orders')}>Quay lại</button>
            <button className="btn-primary" onClick={handleReorder}>Mua lại</button>
          </div>
        </div>

        <div className="order-detail-grid">
          <div>
            <h3>Trạng thái vận chuyển</h3>
            <div className="timeline">
              {order.statusSteps.map(step => (
                <div className="timeline-step" key={step.timestamp + step.label}>
                  <strong>{step.label}</strong>
                  <div className="account-meta">{step.timestamp}</div>
                  {step.description && <div className="account-meta">{step.description}</div>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Thông tin giao hàng</h3>
            <div className="account-card">
              <div>
                <div className="account-meta">{order.addressSummary}</div>
                <div className="account-meta">Phương thức thanh toán: {order.paymentMethod}</div>
                <div className="account-meta"><strong>Tổng tiền:</strong> {order.total.toLocaleString('vi-VN')}đ</div>
              </div>
            </div>
          </div>
        </div>

        <div className="account-section">
          <h3>Sản phẩm</h3>
          <table className="order-items-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Thuộc tính</th>
                <th>Số lượng</th>
                <th>Giá</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id + item.color + item.size}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={item.image} alt={item.name} />
                    <div>
                      <div>{item.name}</div>
                    </div>
                  </td>
                  <td>
                    <div className="account-meta">Màu: {item.color || 'N/A'}</div>
                    <div className="account-meta">Size: {item.size || 'N/A'}</div>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{item.price.toLocaleString('vi-VN')}đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
