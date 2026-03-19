import './Admin.css';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Search, Truck, Eye, Printer, Link2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  canTransitionFulfillment,
  shipLabel,
  paymentLabel,
  type FulfillmentStatus,
  type PaymentStatus
} from './orderWorkflow';
import { AdminStateBlock, AdminTableSkeleton } from './AdminStateBlocks';
import { useAdminListState } from './useAdminListState';
import { adminOrdersData } from './adminOrdersData';
import { ADMIN_VIEW_KEYS, clearPersistedAdminView, getPersistedAdminView, setPersistedAdminView, shareAdminViewUrl } from './adminListView';

interface AdminOrderRow {
  code: string;
  customer: string;
  avatar: string;
  total: string;
  paymentStatus: PaymentStatus;
  shipMethod: string;
  fulfillment: FulfillmentStatus;
  date: string;
}

const initialOrders: AdminOrderRow[] = adminOrdersData.map((order) => ({
  code: order.code,
  customer: order.customer,
  avatar: order.avatar,
  total: order.total,
  paymentStatus: order.paymentStatus,
  shipMethod: order.shipMethod,
  fulfillment: order.fulfillment,
  date: order.date,
}));

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
  { key: 'urgent', label: 'Xử lý gấp' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'packing', label: 'Đang đóng gói' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'done', label: 'Hoàn tất' },
  { key: 'canceled', label: 'Đã hủy' },
];

const validStatusKeys = new Set(tabs.map((tab) => tab.key));

const isPendingOver30Minutes = (row: AdminOrderRow) => {
  if (row.fulfillment !== 'pending') return false;
  const placedAt = new Date(row.date).getTime();
  if (Number.isNaN(placedAt)) return false;
  const diffMinutes = (Date.now() - placedAt) / (1000 * 60);
  return diffMinutes > 30;
};

const formatDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AdminOrders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchQuery = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<string>(() => {
    const currentStatusQuery = searchParams.get('status') || '';
    if (validStatusKeys.has(currentStatusQuery)) return currentStatusQuery;
    const persisted = getPersistedAdminView(ADMIN_VIEW_KEYS.orders);
    if (validStatusKeys.has(persisted)) return persisted;
    return 'all';
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<AdminOrderRow[]>(initialOrders);
  const [toast, setToast] = useState('');
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const {
    search,
    setSearch,
    isLoading,
    filteredItems: filteredOrders,
    pagedItems: pagedOrders,
    page,
    totalPages,
    startIndex,
    endIndex,
    next,
    prev,
    setPage,
    clearFilters,
  } = useAdminListState<AdminOrderRow>({
    items: rows,
    pageSize: 6,
    initialSearch: initialSearchQuery,
    getSearchText: (o) => `${o.code} ${o.customer} ${paymentLabel(o.paymentStatus)} ${shipLabel(o.fulfillment)}`,
    filterPredicate: (o) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'urgent') return isPendingOver30Minutes(o);
      return o.fulfillment === activeTab;
    },
    loadingDeps: [activeTab],
  });

  useEffect(() => {
    const statusQuery = searchParams.get('status');
    if (!statusQuery) return;
    const nextTab = validStatusKeys.has(statusQuery) ? statusQuery : 'all';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
      setSelected(new Set());
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const querySearch = searchParams.get('q') || '';
    if (querySearch !== search) {
      setSearch(querySearch);
    }
  }, [searchParams, search, setSearch]);

  useEffect(() => {
    setPersistedAdminView(ADMIN_VIEW_KEYS.orders, activeTab);
  }, [activeTab]);

  const shareCurrentView = async () => {
    try {
      await shareAdminViewUrl(`/admin/orders${window.location.search}`);
      pushToast('Đã copy link view hiện tại.');
    } catch {
      pushToast('Không thể copy link, vui lòng thử lại.');
    }
  };

  const resetCurrentView = () => {
    clearFilters();
    setSelected(new Set());
    setActiveTab('all');
    setSearchParams({});
    clearPersistedAdminView(ADMIN_VIEW_KEYS.orders);
    pushToast('Đã đặt lại view đơn hàng về mặc định.');
  };

  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label || 'Tất cả';
  const hasViewContext = activeTab !== 'all' || Boolean(search.trim());

  const tabCounts = {
    all: rows.length,
    urgent: rows.filter((o) => isPendingOver30Minutes(o)).length,
    pending: rows.filter((o) => o.fulfillment === 'pending').length,
    packing: rows.filter((o) => o.fulfillment === 'packing').length,
    shipping: rows.filter((o) => o.fulfillment === 'shipping').length,
    done: rows.filter((o) => o.fulfillment === 'done').length,
    canceled: rows.filter((o) => o.fulfillment === 'canceled').length,
  } as const;

  const changeTab = (nextTab: string) => {
    setActiveTab(nextTab);
    setSelected(new Set());
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'all') nextParams.delete('status');
    else nextParams.set('status', nextTab);
    setSearchParams(nextParams);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) nextParams.set('q', value.trim());
    else nextParams.delete('q');
    if (activeTab === 'all') nextParams.delete('status');
    else nextParams.set('status', activeTab);
    setSearchParams(nextParams);
  };

  const pushToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  };

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

  const handleBulkConfirm = () => {
    const targetCodes = rows
      .filter(o => selected.has(o.code) && canTransitionFulfillment(o.fulfillment, 'packing', o.paymentStatus))
      .map(o => o.code);

    if (targetCodes.length === 0) {
      pushToast('Không có đơn hợp lệ để xác nhận.');
      return;
    }

    const codeSet = new Set(targetCodes);
    setRows(prev => prev.map(o => (codeSet.has(o.code) ? { ...o, fulfillment: 'packing' } : o)));
    setSelected(new Set());
    pushToast(`Đã xác nhận ${targetCodes.length} đơn hàng.`);
    setShowBulkConfirmModal(false);
  };

  const selectedCount = selected.size;
  const eligibleForConfirmCount = rows.filter(o => selected.has(o.code) && canTransitionFulfillment(o.fulfillment, 'packing', o.paymentStatus)).length;
  const skippedCount = Math.max(0, selectedCount - eligibleForConfirmCount);

  const handleBulkPrint = () => {
    if (selected.size === 0) return;
    pushToast(`Đang chuẩn bị in ${selected.size} hóa đơn...`);
  };

  return (
    <AdminLayout 
      title="Đơn hàng"
      actions={
        <>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm mã đơn, tên khách hoặc SĐT..." value={search} onChange={e => handleSearchChange(e.target.value)} />
          </div>
          <button className="admin-ghost-btn"><Filter size={16} /> Bộ lọc</button>
          <button className="admin-ghost-btn" onClick={shareCurrentView}><Link2 size={16} /> Share view</button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Reset view</button>
        </>
      }
    >
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => changeTab(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="admin-tab-count">{tabCounts[tab.key as keyof typeof tabCounts]}</span>
          </button>
        ))}
      </div>

      {hasViewContext && (
        <div className="admin-view-summary">
          <span className="summary-chip">Trạng thái: {activeTabLabel}</span>
          {search.trim() && <span className="summary-chip">Từ khóa: {search.trim()}</span>}
          <button className="summary-clear" onClick={resetCurrentView}>Xóa bộ lọc</button>
        </div>
      )}

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Danh sách đơn hàng</h2>
            <Link to="/admin">Tổng quan</Link>
          </div>
          {isLoading ? (
            <AdminTableSkeleton columns={8} rows={6} />
          ) : filteredOrders.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
              description={search.trim() ? 'Thử đổi từ khóa tìm kiếm hoặc xóa bộ lọc trạng thái.' : 'Đơn mới sẽ xuất hiện tại đây khi khách hàng đặt hàng.'}
              actionLabel="Đặt lại bộ lọc"
              onAction={resetCurrentView}
            />
          ) : (
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
            {pagedOrders.map((order, idx) => (
              <motion.div
                className="admin-table-row wide"
                role="row"
                key={order.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.16) }}
                whileHover={{ y: -1 }}
              >
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
                <div role="cell"><span className={`admin-pill ${tone(paymentLabel(order.paymentStatus))}`}>{paymentLabel(order.paymentStatus)}</span></div>
                <div role="cell">
                  <div className="admin-ship">
                    <span className={`admin-pill ${tone(shipLabel(order.fulfillment))}`}><Truck size={14} /> {shipLabel(order.fulfillment)}</span>
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
              </motion.div>
            ))}
          </div>
          )}

          {!isLoading && filteredOrders.length > 0 && (
            <div className="table-footer">
              <span className="admin-muted">Hiển thị {startIndex}-{endIndex} của {filteredOrders.length} đơn hàng</span>
              <div className="pagination">
                <button className="page-btn" onClick={prev} disabled={page === 1}>Trước</button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button key={idx + 1} className={`page-btn ${page === idx + 1 ? 'active' : ''}`} onClick={() => setPage(idx + 1)}>
                    {idx + 1}
                  </button>
                ))}
                <button className="page-btn" onClick={next} disabled={page === totalPages}>Tiếp</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            className="admin-floating-bar"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="admin-floating-content">
              <span>{selected.size} đơn hàng đã chọn</span>
              <div className="admin-actions">
                <button className="admin-ghost-btn" onClick={() => setShowBulkConfirmModal(true)}>Xác nhận</button>
                <button className="admin-ghost-btn" onClick={handleBulkPrint}>In hóa đơn</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selected.size > 0 && showBulkConfirmModal && (
        <>
          <div className="drawer-overlay" onClick={() => setShowBulkConfirmModal(false)} />
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-label="Xác nhận đơn hàng hàng loạt">
            <h3>Xác nhận đơn hàng hàng loạt</h3>
            <p>Bạn đang thao tác trên <strong>{selectedCount}</strong> đơn hàng đã chọn.</p>
            <div className="confirm-impact-grid">
              <div>
                <span className="admin-muted small">Đơn hợp lệ chuyển sang Đang đóng gói</span>
                <p className="admin-bold">{eligibleForConfirmCount}</p>
              </div>
              <div>
                <span className="admin-muted small">Đơn bị bỏ qua do sai trạng thái</span>
                <p className="admin-bold">{skippedCount}</p>
              </div>
            </div>
            <div className="confirm-modal-actions">
              <button className="admin-ghost-btn" onClick={() => setShowBulkConfirmModal(false)}>Hủy</button>
              <button className="admin-primary-btn" onClick={handleBulkConfirm} disabled={eligibleForConfirmCount === 0}>Xác nhận hàng loạt</button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast success">{toast}</div>}
    </AdminLayout>
  );
};

export default AdminOrders;
