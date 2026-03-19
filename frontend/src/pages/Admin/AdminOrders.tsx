import './Admin.css';
import { Link } from 'react-router-dom';
import { Filter, Search, Truck, Eye, Printer } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useMemo, useState } from 'react';

const orders = [
  { code: 'ORD-10234', customer: 'Nguyễn Văn A', avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=0D8ABC&color=fff', total: '1.250.000 đ', pay: 'Đã thanh toán', ship: 'Đang giao', shipMethod: 'GHN - Giao nhanh', fulfillment: 'shipping', date: '2026-03-10T10:32:00' },
  { code: 'ORD-10233', customer: 'Trần Thu B', avatar: 'https://ui-avatars.com/api/?name=Tran+Thu+B&background=F59E0B&color=fff', total: '780.000 đ', pay: 'Chưa thanh toán', ship: 'Chưa giao', shipMethod: 'GHTK - Tiết kiệm', fulfillment: 'pending', date: '2026-03-10T09:05:00' },
  { code: 'ORD-10232', customer: 'Lê Hữu C', avatar: 'https://ui-avatars.com/api/?name=Le+Huu+C&background=10B981&color=fff', total: '2.150.000 đ', pay: 'Đã thanh toán', ship: 'Đã giao', shipMethod: 'ShopeeXpress', fulfillment: 'done', date: '2026-03-09T17:45:00' },
  { code: 'ORD-10231', customer: 'Phạm Hương', avatar: 'https://ui-avatars.com/api/?name=Pham+Huong&background=6366F1&color=fff', total: '560.000 đ', pay: 'Đang hoàn tiền', ship: 'Thất bại', shipMethod: 'GHN - Giao nhanh', fulfillment: 'canceled', date: '2026-03-09T16:12:00' },
];

const tone = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('đã thanh toán') || s.includes('đã giao')) return 'success';
  if (s.includes('đang') || s.includes('chờ')) return 'pending';
  if (s.includes('thất bại') || s.includes('hoàn tiền')) return 'error';
  if (s.includes('chưa')) return 'neutral';
  return 'neutral';
};

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'packing', label: 'Đang đóng gói' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'done', label: 'Hoàn tất' },
  { key: 'canceled', label: 'Đã hủy' },
];

const formatDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AdminOrders = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    return orders.filter(o => o.fulfillment === activeTab);
  }, [activeTab]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredOrders.map(o => o.code)));
    } else {
      setSelected(new Set());
    }
  };

  const toggleOne = (code: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(code); else next.delete(code);
    setSelected(next);
  };

  return (
    <AdminLayout 
      title="Đơn hàng"
      actions={
        <>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm mã đơn, tên khách hoặc SĐT..." />
          </div>
          <button className="admin-ghost-btn"><Filter size={16} /> Bộ lọc</button>
        </>
      }
    >
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.key); setSelected(new Set()); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-bulk-bar">
        <span>{selected.size} đơn được chọn</span>
        <div className="admin-actions">
          <button className="admin-ghost-btn" disabled={selected.size === 0}>Xác nhận</button>
          <button className="admin-ghost-btn" disabled={selected.size === 0}>In hóa đơn</button>
        </div>
      </div>

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Danh sách đơn hàng</h2>
            <Link to="/admin">Tổng quan</Link>
          </div>
          <div className="admin-table" role="table" aria-label="Danh sách đơn hàng">
            <div className="admin-table-row admin-table-head wide" role="row">
              <div role="columnheader">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  checked={selected.size === filteredOrders.length && filteredOrders.length > 0}
                  onChange={e => toggleAll(e.target.checked)}
                />
              </div>
              <div role="columnheader">Mã đơn</div>
              <div role="columnheader">Khách hàng</div>
              <div role="columnheader">Tổng tiền</div>
              <div role="columnheader">Thanh toán</div>
              <div role="columnheader">Vận chuyển</div>
              <div role="columnheader">Ngày đặt</div>
              <div role="columnheader">Hành động</div>
            </div>
            {filteredOrders.map(order => (
              <div className="admin-table-row wide" role="row" key={order.code}>
                <div role="cell">
                  <input
                    type="checkbox"
                    aria-label={`Chọn ${order.code}`}
                    checked={selected.has(order.code)}
                    onChange={e => toggleOne(order.code, e.target.checked)}
                  />
                </div>
                <div role="cell" className="admin-bold">#{order.code}</div>
                <div role="cell">
                  <div className="admin-customer">
                    <img src={order.avatar} alt={order.customer} />
                    <span>{order.customer}</span>
                  </div>
                </div>
                <div role="cell">{order.total}</div>
                <div role="cell"><span className={`admin-pill ${tone(order.pay)}`}>{order.pay}</span></div>
                <div role="cell">
                  <div className="admin-ship">
                    <span className={`admin-pill ${tone(order.ship)}`}><Truck size={14} /> {order.ship}</span>
                    <span className="admin-muted">{order.shipMethod}</span>
                  </div>
                </div>
                <div role="cell" className="admin-muted">{formatDateTime(order.date)}</div>
                <div role="cell" className="admin-actions">
                  <Link to={`/admin/orders/${order.code}`} className="admin-icon-btn" aria-label="Xem chi tiết">
                    <Eye size={16} />
                  </Link>
                  <button className="admin-icon-btn" type="button" aria-label="In hóa đơn">
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminOrders;
