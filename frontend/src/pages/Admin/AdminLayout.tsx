import './Admin.css';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import type { ReactNode } from 'react';

interface AdminLayoutProps {
  title: string;
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

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <LayoutGrid size={22} />
          <span>Admin</span>
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`admin-nav-link ${location.pathname.startsWith(item.to) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-card">
          <p>Thiết lập gateway thanh toán, phí ship, email thông báo.</p>
          <Link to="/admin/settings" className="admin-sidebar-btn">Cấu hình ngay</Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <h1>{title}</h1>
          <div className="admin-topbar-actions">{actions}</div>
        </header>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
