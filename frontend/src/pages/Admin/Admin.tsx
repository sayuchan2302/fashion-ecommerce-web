import './Admin.css';
import { Link } from 'react-router-dom';
import { Package, DollarSign, AlertTriangle, Users, Tag, Shield, ArrowUpRight, ArrowDownRight, Search, Plus } from 'lucide-react';
import AdminLayout from './AdminLayout';

const stats = [
  { label: 'Đơn hôm nay', value: '248', change: '+12%', tone: 'up', icon: <Package size={18} /> },
  { label: 'Doanh thu', value: '1.24B đ', change: '+8%', tone: 'up', icon: <DollarSign size={18} /> },
  { label: 'Chờ xử lý', value: '36', change: '-5%', tone: 'down', icon: <AlertTriangle size={18} /> },
  { label: 'Khách mới', value: '58', change: '+3%', tone: 'up', icon: <Users size={18} /> },
];

const quickLinks = [
  { label: 'Tạo sản phẩm', to: '#', icon: <Plus size={16} /> },
  { label: 'Tạo voucher', to: '#', icon: <Tag size={16} /> },
  { label: 'Xử lý đổi trả', to: '/returns', icon: <Shield size={16} /> },
];

const recentOrders = [
  { code: 'DH-10234', customer: 'Nguyễn Văn A', total: '1.250.000 đ', status: 'Đang xử lý', channel: 'Web' },
  { code: 'DH-10233', customer: 'Trần Thu B', total: '780.000 đ', status: 'Đã thanh toán', channel: 'App' },
  { code: 'DH-10232', customer: 'Lê Hữu C', total: '2.150.000 đ', status: 'Chờ giao', channel: 'Web' },
  { code: 'DH-10231', customer: 'Phạm Hương', total: '560.000 đ', status: 'Hoàn tất', channel: 'Kênh CSKH' },
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
      <section className="admin-stats">
        {stats.map((item) => (
          <div className="admin-stat-card" key={item.label}>
            <div className="admin-stat-icon">{item.icon}</div>
            <div className="admin-stat-body">
              <p className="admin-stat-label">{item.label}</p>
              <div className="admin-stat-value">{item.value}</div>
              <div className={`admin-stat-change ${item.tone}`}>
                {item.tone === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{item.change}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="admin-panels">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Đơn hàng gần đây</h2>
            <Link to="/admin/orders">Xem tất cả</Link>
          </div>
          <div className="admin-table" role="table" aria-label="Đơn hàng gần đây">
            <div className="admin-table-row admin-table-head" role="row">
              <div role="columnheader">Mã đơn</div>
              <div role="columnheader">Khách</div>
              <div role="columnheader">Tổng</div>
              <div role="columnheader">Trạng thái</div>
              <div role="columnheader">Kênh</div>
            </div>
            {recentOrders.map(order => (
              <div className="admin-table-row" role="row" key={order.code}>
                <div role="cell" className="admin-bold">{order.code}</div>
                <div role="cell">{order.customer}</div>
                <div role="cell">{order.total}</div>
                <div role="cell"><span className={`admin-pill ${statusTone(order.status)}`}>{order.status}</span></div>
                <div role="cell" className="admin-muted">{order.channel}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel admin-panel-side">
          <div className="admin-panel-head">
            <h2>Hành động nhanh</h2>
          </div>
          <div className="admin-quick-links">
            {quickLinks.map(link => (
              <Link key={link.label} to={link.to} className="admin-quick-card">
                <div className="admin-quick-icon">{link.icon}</div>
                <div>
                  <p className="admin-quick-label">{link.label}</p>
                  <p className="admin-quick-desc">Đi tới trang quản trị tương ứng</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="admin-panel-head">
            <h2>Nhắc việc</h2>
          </div>
          <ul className="admin-task-list">
            <li>• 12 đơn chờ xác nhận thanh toán</li>
            <li>• 6 đơn đã quá SLA giao hàng</li>
            <li>• 4 sản phẩm tồn kho &lt; 10</li>
          </ul>
        </div>
      </section>
    </AdminLayout>
  );
};

export default Admin;
