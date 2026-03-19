import './Admin.css';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Search, Bell, Settings, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface AdminLayoutProps {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

const navItems = [
  { label: 'Tổng quan', to: '/admin' },
  { label: 'Đơn hàng', to: '/admin/orders' },
  { label: 'Sản phẩm', to: '/admin/products' },
  { label: 'Khách hàng', to: '/admin/customers' },
  { label: 'Khuyến mãi', to: '/admin/promotions' },
  { label: 'Nội dung', to: '/admin/content' },
  { label: 'Cấu hình', to: '/admin/settings' },
];

const AdminLayout = ({ title, actions, children }: AdminLayoutProps) => {
  const location = useLocation();

  const breadcrumbs = () => {
    const path = location.pathname;
    if (path.startsWith('/admin/orders/')) return ['Đơn hàng', 'Chi tiết'];
    if (path.startsWith('/admin/orders')) return ['Đơn hàng', 'Danh sách'];
    if (path.startsWith('/admin/products')) return ['Sản phẩm', 'Danh sách'];
    return ['Tổng quan'];
  };

  const crumbs = breadcrumbs();

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <LayoutGrid size={22} />
          <span>Admin</span>
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => {
            const isActive = item.to === '/admin' 
              ? location.pathname === '/admin' 
              : location.pathname.startsWith(item.to);
              
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`admin-nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-card">
          <p>Thiết lập gateway thanh toán, phí ship, email thông báo.</p>
          <Link to="/admin/settings" className="admin-sidebar-btn">Cấu hình ngay</Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-breadcrumbs" aria-label="Breadcrumb">
            {crumbs.map((crumb, idx) => (
              <span key={crumb} className="breadcrumb-item">
                {crumb}
                {idx < crumbs.length - 1 && <ChevronRight size={14} />}
              </span>
            ))}
          </div>

          <div className="admin-header-search">
            <Search size={16} />
            <input placeholder="Tìm nhanh đơn hàng, sản phẩm..." />
          </div>

          <div className="admin-header-actions">
            <button className="admin-icon-btn subtle has-dot" aria-label="Thông báo">
              <Bell size={16} />
              <span className="notif-dot" />
            </button>
            <button className="admin-icon-btn subtle" aria-label="Cài đặt">
              <Settings size={16} />
            </button>
            <div className="admin-avatar">
              <span className="avatar-circle">A</span>
              <span className="avatar-name">Admin</span>
            </div>
          </div>
        </header>

        <div className="admin-topbar actions-row">
          <h1>{title}</h1>
          <div className="admin-topbar-actions">{actions}</div>
        </div>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
