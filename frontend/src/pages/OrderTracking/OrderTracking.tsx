import { useState } from 'react';
import { CheckCircle2, Clock, MapPin, Package, Phone, Search, XCircle } from 'lucide-react';
import './OrderTracking.css';
import { useToast } from '../../contexts/ToastContext';

type TrackingStep = {
  label: string;
  time: string;
  description?: string;
  status: 'done' | 'current' | 'upcoming';
};

type MockOrder = {
  id: string;
  phone: string;
  customer: string;
  address: string;
  eta: string;
  status: 'delivered' | 'shipping' | 'processing' | 'pending' | 'cancelled';
  steps: TrackingStep[];
};

const mockOrders: MockOrder[] = [
  {
    id: 'CM20260301',
    phone: '0382253049',
    customer: 'Ngọc Thịnh Nguyễn',
    address: 'JJJV+Q7F, Quốc lộ 37, Hùng Sơn, Đại Từ, Thái Nguyên',
    eta: 'Dự kiến giao: 14/03/2026',
    status: 'shipping',
    steps: [
      { label: 'Tiếp nhận', time: '10/03/2026 10:12', status: 'done' },
      { label: 'Đang chuẩn bị hàng', time: '10/03/2026 16:00', status: 'done' },
      { label: 'Đang giao', time: '11/03/2026 08:10', description: 'Đang vận chuyển tới bưu cục đích', status: 'current' },
      { label: 'Giao thành công', time: '--', status: 'upcoming' },
    ],
  },
  {
    id: 'CM20260228',
    phone: '0912345678',
    customer: 'Anh Minh',
    address: '12 Nguyễn Trãi, Hà Nội',
    eta: 'Đã giao: 02/03/2026',
    status: 'delivered',
    steps: [
      { label: 'Tiếp nhận', time: '28/02/2026 09:12', status: 'done' },
      { label: 'Đang chuẩn bị hàng', time: '28/02/2026 13:00', status: 'done' },
      { label: 'Đang giao', time: '01/03/2026 08:15', status: 'done' },
      { label: 'Giao thành công', time: '02/03/2026 11:25', status: 'done' },
    ],
  },
];

const OrderTracking = () => {
  const { addToast } = useToast();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<MockOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotFound(false);
    setTimeout(() => {
      const found = mockOrders.find(
        (o) => o.id.toLowerCase() === orderId.trim().toLowerCase() && o.phone.trim() === phone.trim()
      );
      if (found) {
        setResult(found);
        addToast('Đã tìm thấy đơn hàng', 'success');
      } else {
        setResult(null);
        setNotFound(true);
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="tracking-page">
      <div className="tracking-container">
        <div className="tracking-hero">
          <div>
            <p className="hero-kicker">Theo dõi đơn hàng</p>
            <h1 className="hero-title">Kiểm tra trạng thái giao hàng của bạn</h1>
            <p className="hero-sub">Nhập mã đơn và số điện thoại để cập nhật lộ trình.</p>
          </div>
          <div className="hero-icon"><Package size={46} /></div>
        </div>

        <form className="tracking-form" onSubmit={handleSearch}>
          <div className="form-group">
            <label>Mã đơn hàng</label>
            <div className="input-with-icon">
              <input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="VD: CM20260301"
                required
              />
              <Search size={16} />
            </div>
          </div>
          <div className="form-group">
            <label>Số điện thoại</label>
            <div className="input-with-icon">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0382253049"
                required
              />
              <Phone size={16} />
            </div>
          </div>
          <button type="submit" className="btn-search" disabled={loading}>
            {loading ? 'Đang tra cứu...' : 'Tra cứu đơn hàng'}
          </button>
        </form>

        {notFound && (
          <div className="tracking-empty">
            <XCircle size={28} />
            <div>
              <h3>Không tìm thấy đơn hàng</h3>
              <p>Kiểm tra lại mã đơn hàng và số điện thoại bạn đã nhập.</p>
            </div>
          </div>
        )}

        {result && (
          <div className="tracking-result">
            <div className="result-header">
              <div>
                <p className="result-id">Mã đơn: <strong>{result.id}</strong></p>
                <p className="result-meta">Khách hàng: {result.customer}</p>
                <p className="result-meta">SĐT: {result.phone}</p>
                <p className="result-meta"><MapPin size={14} /> {result.address}</p>
              </div>
              <div className="result-status">
                <span className={`status-pill status-${result.status}`}>{result.status}</span>
                <p className="eta-text">{result.eta}</p>
              </div>
            </div>

            <div className="tracking-steps">
              {result.steps.map((step) => (
                <div key={step.label + step.time} className={`step-card ${step.status}`}>
                  <div className="step-icon">
                    {step.status === 'done' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  </div>
                  <div className="step-body">
                    <p className="step-label">{step.label}</p>
                    <p className="step-time">{step.time}</p>
                    {step.description && <p className="step-desc">{step.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
