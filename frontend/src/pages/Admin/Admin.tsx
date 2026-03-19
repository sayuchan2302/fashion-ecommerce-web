import './Admin.css';
import { Link } from 'react-router-dom';
import { Package, DollarSign, AlertTriangle, Users, ArrowUpRight, ArrowDownRight, Search, Plus, Zap, Gift, RefreshCcw, Clock3, CreditCard } from 'lucide-react';
import AdminLayout from './AdminLayout';

const stats = [
  { label: 'Đơn hôm nay', value: '248', change: '+12%', tone: 'up', icon: <Package size={18} />, spark: [12, 14, 11, 16, 18, 20, 22] },
  { label: 'Doanh thu', value: '1.24B đ', change: '+8%', tone: 'up', icon: <DollarSign size={18} />, spark: [80, 82, 79, 85, 88, 90, 94] },
  { label: 'Chờ xử lý', value: '36', change: '-5%', tone: 'down', icon: <AlertTriangle size={18} />, spark: [40, 42, 38, 36, 35, 37, 36] },
  { label: 'Khách mới', value: '58', change: '+3%', tone: 'up', icon: <Users size={18} />, spark: [50, 52, 51, 55, 56, 57, 58] },
];

const revenueData = [1.2, 1.5, 1.1, 1.8, 2.2, 2.0, 2.4]; // millions

const recentOrders = [
  { code: 'ORD-10234', customer: 'Nguyễn Văn A', total: '1.250.000 đ', status: 'Đang xử lý', channel: 'web', thumb: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=120&h=140&q=80' },
  { code: 'ORD-10233', customer: 'Trần Thu B', total: '780.000 đ', status: 'Đã thanh toán', channel: 'mobile', thumb: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=120&h=140&q=80' },
  { code: 'ORD-10232', customer: 'Lê Hữu C', total: '2.150.000 đ', status: 'Chờ giao', channel: 'web', thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&h=140&q=80' },
  { code: 'ORD-10231', customer: 'Phạm Hương', total: '560.000 đ', status: 'Hoàn tất', channel: 'mobile', thumb: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=120&h=140&q=80' },
];

const topProducts = [
  { name: 'Áo Polo Cotton', sales: 1240, img: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=120&h=140&q=80' },
  { name: 'Quần Jeans Slim', sales: 980, img: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=120&h=140&q=80' },
  { name: 'Áo Thun Basic', sales: 860, img: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=120&h=140&q=80' },
];

const statusTone = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('đang') || s.includes('chờ')) return 'pending';
  if (s.includes('hoàn') || s.includes('đã thanh toán')) return 'success';
  return 'neutral';
};

const Admin = () => {
  return (
    <AdminLayout
      title="Tổng quan"
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm đơn hàng, khách hàng..." />
          </div>
          <Link to="/admin/orders" className="admin-ghost-btn">Xem đơn</Link>
          <Link to="/admin/products" className="admin-primary-btn">Thêm sản phẩm</Link>
        </>
      )}
    >
      <section className="admin-stats grid-4">
        {stats.map((item) => (
          <div className="admin-stat-card compact" key={item.label}>
            <div className="admin-stat-header">
              <div className="admin-stat-icon">{item.icon}</div>
              <div className={`admin-stat-change ${item.tone}`}>
                {item.tone === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{item.change}</span>
              </div>
            </div>
            <p className="admin-stat-label">{item.label}</p>
            <div className="admin-stat-value">{item.value}</div>
            <svg className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path
                d={`M ${item.spark.map((v, i) => `${(i / (item.spark.length - 1)) * 100} ${30 - (v / Math.max(...item.spark)) * 26}`).join(' L ')}`}
                fill="none"
                stroke={item.tone === 'up' ? '#10b981' : '#f43f5e'}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ))}
      </section>

      <div className="admin-grid">
        <div className="admin-left">
          <section className="admin-panel">
            <div className="admin-panel-head">
              <h2>Doanh thu 7 ngày</h2>
              <span className="admin-muted">+8% vs tuần trước</span>
            </div>
            <div className="area-chart-wrap">
              <svg className="area-chart" viewBox="0 0 100 50" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(15,23,42,0.25)" />
                    <stop offset="100%" stopColor="rgba(15,23,42,0.02)" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0 50 L ${revenueData.map((v, i) => `${(i / (revenueData.length - 1)) * 100} ${50 - (v / Math.max(...revenueData)) * 44}`).join(' L ')} L 100 50 Z`}
                  fill="url(#revGradient)"
                />
                <path
                  d={`M ${revenueData.map((v, i) => `${(i / (revenueData.length - 1)) * 100} ${50 - (v / Math.max(...revenueData)) * 44}`).join(' L ')}`}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="1" />
                <line x1="0" y1="0" x2="0" y2="50" stroke="#e5e7eb" strokeWidth="1" />
              </svg>
              <div className="chart-axes">
                <span>Ngày</span>
                <span>VNĐ</span>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <h2>Đơn hàng gần đây</h2>
              <Link to="/admin/orders">Xem tất cả</Link>
            </div>
            <div className="admin-table" role="table" aria-label="Đơn hàng gần đây">
              <div className="admin-table-row admin-table-head recent" role="row">
                <div role="columnheader">Mã đơn</div>
                <div role="columnheader">Khách</div>
                <div role="columnheader">Tổng</div>
                <div role="columnheader">Trạng thái</div>
              </div>
              {recentOrders.map(order => (
                <div className="admin-table-row recent" role="row" key={order.code}>
                  <div role="cell" className="admin-bold">{order.code}</div>
                  <div role="cell" className="admin-customer">
                    <img src={order.thumb} alt={order.customer} />
                    <span>{order.customer}</span>
                  </div>
                  <div role="cell">{order.total}</div>
                  <div role="cell"><span className={`admin-pill ${statusTone(order.status)}`}>{order.status}</span></div>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <h2>Top bán chạy</h2>
            </div>
            <div className="top-products">
              {topProducts.map((p, idx) => (
                <div key={p.name} className="top-product">
                  <div className="top-rank">Top {idx + 1}</div>
                  <img src={p.img} alt={p.name} />
                  <div>
                    <p className="admin-bold">{p.name}</p>
                    <p className="admin-muted">{p.sales} bán</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="admin-right">
          <section className="admin-panel">
            <div className="admin-panel-head">
              <h2>Action Center</h2>
            </div>
            <div className="action-grid">
              <Link to="/admin/products" className="action-tile"><Plus size={18} /> Thêm sản phẩm</Link>
              <Link to="/admin/promotions" className="action-tile"><Gift size={18} /> Tạo voucher</Link>
              <Link to="/returns" className="action-tile"><RefreshCcw size={18} /> Đổi/Trả</Link>
              <Link to="/admin/orders" className="action-tile"><Zap size={18} /> Xử lý nhanh</Link>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <h2>Alerts</h2>
            </div>
            <div className="alert-grid">
              <button className="alert-pill danger"><Clock3 size={16} /> <strong>6</strong> đơn trễ SLA</button>
              <button className="alert-pill warning"><Package size={16} /> <strong>4</strong> sản phẩm tồn thấp</button>
              <button className="alert-pill info"><CreditCard size={16} /> <strong>12</strong> thanh toán chờ</button>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Admin;
