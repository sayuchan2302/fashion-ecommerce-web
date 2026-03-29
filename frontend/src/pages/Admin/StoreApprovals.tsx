import './AdminStores.css';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, Check, Eye, Link2, RotateCcw, Search, Store, User, X } from 'lucide-react';
import AdminLayout from './AdminLayout';
import AdminConfirmDialog from './AdminConfirmDialog';
import { AdminStateBlock } from './AdminStateBlocks';
import {
  PanelDrawerFooter,
  PanelDrawerHeader,
  PanelDrawerSection,
  PanelStatsGrid,
  PanelTabs,
} from '../../components/Panel/PanelPrimitives';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import { storeService, type StoreProfile } from '../../services/storeService';
import Drawer from '../../components/Drawer/Drawer';

interface ManagedStore extends StoreProfile {
  operatingStatus: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  productCount: number;
  liveProductCount: number;
  responseRate: number;
  warehouseAddress: string;
}

type StoreFilter = 'all' | 'pending' | 'active' | 'suspended' | 'rejected';
type ConfirmMode = 'approve' | 'suspend' | 'reactivate';
type ConfirmState = { mode: ConfirmMode; ids: string[]; selectedItems: string[] };

const TABS: Array<{ key: StoreFilter; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'suspended', label: 'Tạm khóa' },
  { key: 'rejected', label: 'Từ chối' },
];

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

const approvalLabel = (status: ManagedStore['approvalStatus']) => {
  if (status === 'APPROVED') return 'Đã duyệt';
  if (status === 'REJECTED') return 'Đã từ chối';
  return 'Chờ duyệt';
};

const approvalTone = (status: ManagedStore['approvalStatus']) => {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'error';
  return 'pending';
};

const operatingLabel = (status: ManagedStore['operatingStatus']) => {
  if (status === 'ACTIVE') return 'Đang hoạt động';
  if (status === 'SUSPENDED') return 'Tạm khóa';
  return 'Chưa kích hoạt';
};

const operatingTone = (status: ManagedStore['operatingStatus']) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUSPENDED') return 'error';
  return 'neutral';
};

const mapStore = (store: StoreProfile): ManagedStore => ({
  ...store,
  operatingStatus:
    store.approvalStatus === 'APPROVED'
      ? store.status === 'SUSPENDED'
        ? 'SUSPENDED'
        : 'ACTIVE'
      : 'INACTIVE',
  productCount: Number(store.productCount ?? 0),
  liveProductCount: Number(store.liveProductCount ?? 0),
  responseRate: Number(store.responseRate ?? 0),
  warehouseAddress: store.warehouseAddress || store.address || 'Chưa cấu hình kho lấy hàng',
});


const StoreApprovals = () => {
  const { addToast } = useToast();
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<StoreFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailStore, setDetailStore] = useState<ManagedStore | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    let active = true;

    const fetchStores = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const adminStores = await storeService.getAdminStores();
        if (!active) return;
        setStores(adminStores.map(mapStore));
      } catch (error: unknown) {
        if (!active) return;
        setStores([]);
        const message = getUiErrorMessage(error, 'Không tải được danh sách gian hàng từ backend.');
        setLoadError(message);
        addToast(message, 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchStores();
    return () => {
      active = false;
    };
  }, [addToast, reloadKey]);

  const filteredStores = useMemo(() => {
    let next = stores;
    if (activeTab !== 'all') {
      next = next.filter((store) => {
        if (activeTab === 'pending') return store.approvalStatus === 'PENDING';
        if (activeTab === 'active') return store.approvalStatus === 'APPROVED' && store.operatingStatus === 'ACTIVE';
        if (activeTab === 'suspended') return store.approvalStatus === 'APPROVED' && store.operatingStatus === 'SUSPENDED';
        return store.approvalStatus === 'REJECTED';
      });
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      next = next.filter((store) =>
        `${store.name} ${store.slug} ${store.applicantName || ''} ${store.applicantEmail || ''} ${store.contactEmail || ''} ${store.phone || ''}`
          .toLowerCase()
          .includes(query),
      );
    }
    return next;
  }, [activeTab, search, stores]);

  const counts = useMemo(() => ({
    all: stores.length,
    pending: stores.filter((store) => store.approvalStatus === 'PENDING').length,
    active: stores.filter((store) => store.approvalStatus === 'APPROVED' && store.operatingStatus === 'ACTIVE').length,
    suspended: stores.filter((store) => store.approvalStatus === 'APPROVED' && store.operatingStatus === 'SUSPENDED').length,
    rejected: stores.filter((store) => store.approvalStatus === 'REJECTED').length,
  }), [stores]);

  const totalPages = Math.max(Math.ceil(filteredStores.length / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const pagedStores = useMemo(() => filteredStores.slice((safePage - 1) * pageSize, safePage * pageSize), [filteredStores, safePage]);

  const resetCurrentView = () => { setSearch(''); setActiveTab('all'); setSelected(new Set()); setPage(1); };

  const shareCurrentView = async () => {
    try { await navigator.clipboard.writeText(window.location.href); addToast('Đã sao chép bộ lọc hiện tại của gian hàng', 'success'); }
    catch { addToast('Không thể sao chép liên kết bộ lọc', 'error'); }
  };

  const openConfirm = (mode: ConfirmMode, ids: string[]) => {
    const items = stores.filter((store) => ids.includes(store.id));
    if (items.length === 0) return;
    setConfirmState({ mode, ids: items.map((item) => item.id), selectedItems: items.map((item) => item.name) });
  };

  const approveStores = async () => {
    if (!confirmState) return;
    setActionLoading(true);
    try {
      const items = stores.filter((store) => confirmState.ids.includes(store.id));
      for (const store of items) {
        const response = await storeService.approveStore(store.id);
        setStores((prev) => prev.map((item) => item.id === response.storeId ? { ...item, approvalStatus: 'APPROVED', status: 'ACTIVE', operatingStatus: 'ACTIVE', rejectionReason: undefined } : item));
        if (detailStore?.id === response.storeId) setDetailStore((current) => current ? { ...current, approvalStatus: 'APPROVED', status: 'ACTIVE', operatingStatus: 'ACTIVE', rejectionReason: undefined } : null);
      }
      setSelected(new Set()); setConfirmState(null);
      addToast('Đã phê duyệt gian hàng đã chọn', 'success');
    } catch (error: unknown) { addToast(getUiErrorMessage(error, 'Phê duyệt gian hàng thất bại'), 'error'); }
    finally { setActionLoading(false); }
  };

  const rejectStore = async () => {
    if (!detailStore) return;
    if (!rejectReason.trim()) { addToast('Vui lòng nhập lý do từ chối hồ sơ gian hàng', 'error'); return; }
    setActionLoading(true);
    try {
      await storeService.rejectStore(detailStore.id, rejectReason.trim());
      setStores((prev) => prev.map((store) => store.id === detailStore.id ? { ...store, approvalStatus: 'REJECTED', rejectionReason: rejectReason.trim(), status: 'INACTIVE', operatingStatus: 'INACTIVE', liveProductCount: 0 } : store));
      setDetailStore((current) => current ? { ...current, approvalStatus: 'REJECTED', rejectionReason: rejectReason.trim(), status: 'INACTIVE', operatingStatus: 'INACTIVE', liveProductCount: 0 } : null);
      setSelected((prev) => { const next = new Set(prev); next.delete(detailStore.id); return next; });
      addToast('Đã từ chối hồ sơ gian hàng', 'info');
    } catch (error: unknown) { addToast(getUiErrorMessage(error, 'Từ chối hồ sơ gian hàng thất bại'), 'error'); }
    finally { setActionLoading(false); }
  };

  const applyStoreOperatingChange = async () => {
    if (!confirmState) return;
    setActionLoading(true);
    try {
      const nextStatus = confirmState.mode === 'suspend' ? 'SUSPENDED' : 'ACTIVE';
      for (const storeId of confirmState.ids) {
        if (confirmState.mode === 'suspend') await storeService.suspendStore(storeId);
        else await storeService.reactivateStore(storeId);
      }
      setStores((prev) => prev.map((store) => confirmState.ids.includes(store.id) ? { ...store, operatingStatus: nextStatus, status: nextStatus } : store));
      if (detailStore && confirmState.ids.includes(detailStore.id)) setDetailStore((current) => current ? { ...current, operatingStatus: nextStatus, status: nextStatus } : null);
      addToast(confirmState.mode === 'suspend' ? 'Đã tạm khóa gian hàng đã chọn' : 'Đã mở lại gian hàng đã chọn', confirmState.mode === 'suspend' ? 'info' : 'success');
      setSelected(new Set()); setConfirmState(null);
    } catch (error: unknown) { addToast(getUiErrorMessage(error, 'Không thể cập nhật trạng thái gian hàng'), 'error'); }
    finally { setActionLoading(false); }
  };

  return (
    <AdminLayout
      title="Gian hàng"
      breadcrumbs={['Gian hàng', 'Quản lý gian hàng']}
      actions={<><div className="admin-search"><Search size={16} /><input placeholder="Tìm theo tên gian hàng, slug, chủ sở hữu hoặc email liên hệ" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><button className="admin-ghost-btn" onClick={() => void shareCurrentView()}><Link2 size={16} />Chia sẻ bộ lọc</button></>}
    >
      <PanelStatsGrid items={[
        { key: 'all', label: 'Tổng gian hàng', value: counts.all, sub: 'Toàn bộ hồ sơ gian hàng trên sàn' },
        { key: 'pending', label: 'Chờ duyệt', value: counts.pending, sub: 'Hồ sơ mới cần phê duyệt', tone: counts.pending > 0 ? 'warning' : '', onClick: () => setActiveTab('pending') },
        { key: 'active', label: 'Đang hoạt động', value: counts.active, sub: 'Gian hàng đang bán trên sàn', tone: 'success', onClick: () => setActiveTab('active') },
        { key: 'suspended', label: 'Tạm khóa', value: counts.suspended, sub: 'Gian hàng bị chặn vận hành tạm thời', tone: counts.suspended > 0 ? 'danger' : '', onClick: () => setActiveTab('suspended') },
      ]} />
      <PanelTabs items={TABS.map((tab) => ({ key: tab.key, label: tab.label, count: counts[tab.key] }))} activeKey={activeTab} onChange={(key) => { setActiveTab(key as StoreFilter); setSelected(new Set()); setPage(1); }} />
      <section className="admin-panels single"><div className="admin-panel"><div className="admin-panel-head">
        <h2>Danh sách gian hàng</h2>
        {selected.size > 0 && (() => {
          const ss = stores.filter((s) => selected.has(s.id));
          const hp = ss.some((s) => s.approvalStatus === 'PENDING');
          const ha = ss.some((s) => s.approvalStatus === 'APPROVED' && s.operatingStatus === 'ACTIVE');
          const hs = ss.some((s) => s.approvalStatus === 'APPROVED' && s.operatingStatus === 'SUSPENDED');
          return (<div className="admin-actions"><span className="admin-muted">Đã chọn {selected.size} gian hàng</span>
            {hp && <button className="admin-ghost-btn" onClick={() => openConfirm('approve', Array.from(selected))}>Duyệt đã chọn</button>}
            {ha && <button className="admin-ghost-btn danger" onClick={() => openConfirm('suspend', Array.from(selected))}>Tạm khóa đã chọn</button>}
            {hs && <button className="admin-ghost-btn" onClick={() => openConfirm('reactivate', Array.from(selected))}>Mở lại đã chọn</button>}
            <button className="admin-ghost-btn" onClick={() => setSelected(new Set())}>Bỏ chọn</button></div>);
        })()}
      </div>
      {!loading && loadError ? (<AdminStateBlock type="error" title="Không tải được danh sách gian hàng" description={loadError} actionLabel="Thử lại" onAction={() => setReloadKey((value) => value + 1)} />) : null}
      {!loading && !loadError && filteredStores.length === 0 ? (<AdminStateBlock type={search.trim() ? 'search-empty' : 'empty'} title={search.trim() ? 'Không tìm thấy gian hàng phù hợp' : 'Chưa có hồ sơ gian hàng'} description={search.trim() ? 'Thử đổi từ khóa hoặc đặt lại bộ lọc để xem lại danh sách gian hàng.' : 'Danh sách gian hàng sẽ hiển thị tại đây để quản trị viên theo dõi và xử lý.'} actionLabel="Đặt lại bộ lọc" onAction={resetCurrentView} />) : null}
      {!loading && !loadError && filteredStores.length > 0 ? (<><div className="admin-table" role="table" aria-label="Bảng gian hàng"><div className="admin-table-row stores admin-table-head" role="row">
        <div role="columnheader"><input type="checkbox" checked={selected.size === filteredStores.length && filteredStores.length > 0} onChange={(event) => setSelected(event.target.checked ? new Set(filteredStores.map((i) => i.id)) : new Set())} /></div>
        <div role="columnheader">Gian hàng</div><div role="columnheader">Chủ sở hữu</div><div role="columnheader">Quy mô vận hành</div><div role="columnheader">Trạng thái</div><div role="columnheader">Ngày tạo</div><div role="columnheader">Hành động</div>
      </div>{pagedStores.map((store) => (<motion.div key={store.id} className="admin-table-row stores" role="row" whileHover={{ y: -1 }} onClick={() => { setDetailStore(store); setRejectReason(store.rejectionReason || ''); }} style={{ cursor: 'pointer' }}>
        <div role="cell" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(store.id)} onChange={(e) => { const n = new Set(selected); if (e.target.checked) n.add(store.id); else n.delete(store.id); setSelected(n); }} /></div>
        <div role="cell" className="store-cell"><div className="store-avatar">{store.logo ? <img src={store.logo} alt={store.name} /> : <Store size={18} />}</div><div className="store-copy"><div className="admin-bold">{store.name}</div><div className="admin-muted small">{store.slug}</div></div></div>
        <div role="cell"><div className="admin-bold">{store.applicantName || 'Chưa đăng ký chủ sở hữu'}</div><div className="admin-muted small">{store.applicantEmail || store.contactEmail || 'Chưa có email'}</div></div>
        <div role="cell" className="store-ops-cell"><div className="admin-bold">{store.productCount.toLocaleString('vi-VN')} SKU</div><div className="admin-muted small">{store.liveProductCount.toLocaleString('vi-VN')} Đang bán · {store.totalOrders.toLocaleString('vi-VN')} đơn</div></div>
        <div role="cell"><div className="store-status-stack"><span className={`admin-pill ${approvalTone(store.approvalStatus)}`}>{approvalLabel(store.approvalStatus)}</span><span className={`admin-pill ${operatingTone(store.operatingStatus)}`}>{operatingLabel(store.operatingStatus)}</span></div></div>
        <div role="cell">{new Date(store.createdAt).toLocaleDateString('vi-VN')}</div>
        <div role="cell" className="admin-actions" onClick={(e) => e.stopPropagation()}>
          <button className="admin-icon-btn subtle" title="Xem hồ sơ gian hàng" aria-label="Xem hồ sơ gian hàng" onClick={() => { setDetailStore(store); setRejectReason(store.rejectionReason || ''); }}><Eye size={16} /></button>
          {store.approvalStatus === 'PENDING' ? <button className="admin-icon-btn subtle" title="Duyệt gian hàng" aria-label="Duyệt gian hàng" onClick={() => openConfirm('approve', [store.id])}><Check size={16} /></button> : null}
          {store.approvalStatus === 'APPROVED' && store.operatingStatus === 'ACTIVE' ? <button className="admin-icon-btn subtle danger-icon" title="Tạm khóa gian hàng" aria-label="Tạm khóa gian hàng" onClick={() => openConfirm('suspend', [store.id])}><Ban size={16} /></button> : null}
          {store.approvalStatus === 'APPROVED' && store.operatingStatus === 'SUSPENDED' ? <button className="admin-icon-btn subtle" title="Mở lại gian hàng" aria-label="Mở lại gian hàng" onClick={() => openConfirm('reactivate', [store.id])}><RotateCcw size={16} /></button> : null}
        </div></motion.div>))}</div>
        <div className="table-footer"><span className="table-footer-meta">Hiển thị {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredStores.length)} trên {filteredStores.length} gian hàng</span>
        <div className="pagination"><button className="page-btn" disabled={safePage === 1} onClick={() => setPage((c) => Math.max(c - 1, 1))}>Trước</button>{Array.from({ length: totalPages }).map((_, i) => (<button key={i + 1} className={`page-btn ${safePage === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>))}<button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage((c) => Math.min(c + 1, totalPages))}>Sau</button></div></div></>) : null}</div></section>
      <AdminConfirmDialog open={Boolean(confirmState)} title={confirmState?.mode === 'approve' ? 'Phê duyệt gian hàng' : confirmState?.mode === 'suspend' ? 'Tạm khóa gian hàng' : 'Mở lại gian hàng'} description={confirmState?.mode === 'approve' ? 'Chủ sở hữu sẽ được kích hoạt quyền người bán và gian hàng chuyển sang trạng thái hoạt động.' : confirmState?.mode === 'suspend' ? 'Gian hàng sẽ bị chặn vận hành tạm thời trên sàn cho đến khi mở lại.' : 'Gian hàng sẽ được mở lại hoạt động và tiếp tục hiển thị trên sàn.'} selectedItems={confirmState?.selectedItems} selectedNoun="gian hàng" confirmLabel={actionLoading ? 'Đang xử lý...' : confirmState?.mode === 'approve' ? 'Duyệt gian hàng' : confirmState?.mode === 'suspend' ? 'Tạm khóa gian hàng' : 'Mở lại gian hàng'} danger={confirmState?.mode === 'suspend'} onCancel={() => setConfirmState(null)} onConfirm={() => { if (!confirmState) return; if (confirmState.mode === 'approve') { void approveStores(); return; } void applyStoreOperatingChange(); }} />
      <Drawer open={Boolean(detailStore)} onClose={() => { setDetailStore(null); setRejectReason(''); }} className="store-drawer">{detailStore ? (<><PanelDrawerHeader eyebrow="Hồ sơ gian hàng" title={detailStore.name} onClose={() => { setDetailStore(null); setRejectReason(''); }} closeLabel="Đóng hồ sơ gian hàng" />
        <div className="drawer-body"><PanelDrawerSection title="Tổng quan gian hàng"><div className="store-drawer-hero"><div className="store-avatar large">{detailStore.logo ? <img src={detailStore.logo} alt={detailStore.name} /> : <Store size={22} />}</div><div><div className="admin-bold">{detailStore.name}</div><div className="admin-muted">{detailStore.slug}</div></div><div className="store-hero-pills"><span className={`admin-pill ${approvalTone(detailStore.approvalStatus)}`}>{approvalLabel(detailStore.approvalStatus)}</span><span className={`admin-pill ${operatingTone(detailStore.operatingStatus)}`}>{operatingLabel(detailStore.operatingStatus)}</span></div></div></PanelDrawerSection>
          <PanelDrawerSection title="Hồ sơ và chủ sở hữu"><div className="admin-card-list"><div className="admin-card-row"><span className="admin-bold"><User size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Chủ sở hữu</span><span className="admin-muted">{detailStore.applicantName || 'Chưa đăng ký chủ sở hữu'}</span></div><div className="admin-card-row"><span className="admin-bold">Email liên hệ</span><span className="admin-muted">{detailStore.applicantEmail || detailStore.contactEmail || 'Chưa có email'}</span></div><div className="admin-card-row"><span className="admin-bold">Số điện thoại</span><span className="admin-muted">{detailStore.phone || 'Chưa cập nhật'}</span></div><div className="admin-card-row"><span className="admin-bold">Kho lấy hàng</span><span className="admin-muted">{detailStore.warehouseAddress}</span></div><div className="admin-card-row"><span className="admin-bold">Tỷ lệ hoa hồng</span><span className="admin-muted">{detailStore.commissionRate != null ? `${detailStore.commissionRate}%` : 'Chưa cấu hình'}</span></div></div></PanelDrawerSection>
          <PanelDrawerSection title="Tín hiệu kinh doanh"><div className="store-signal-grid"><div className="store-signal-card"><span className="admin-muted small">Sản phẩm</span><strong>{`${detailStore.liveProductCount.toLocaleString('vi-VN')}/${detailStore.productCount.toLocaleString('vi-VN')}`}</strong><span className="admin-muted small">đang hiển thị / tổng SKU</span></div><div className="store-signal-card"><span className="admin-muted small">Đơn hàng</span><strong>{detailStore.totalOrders.toLocaleString('vi-VN')}</strong><span className="admin-muted small">đơn đã ghi nhận</span></div><div className="store-signal-card"><span className="admin-muted small">GMV</span><strong>{formatCurrency(detailStore.totalSales)}</strong><span className="admin-muted small">doanh số toàn gian hàng</span></div><div className="store-signal-card"><span className="admin-muted small">Đánh giá</span><strong>{detailStore.rating.toFixed(1)}</strong><span className="admin-muted small">trung bình khách hàng</span></div><div className="store-signal-card"><span className="admin-muted small">Phản hồi</span><strong>{`${detailStore.responseRate.toLocaleString('vi-VN')}%`}</strong><span className="admin-muted small">tỷ lệ phản hồi của shop</span></div><div className="store-signal-card"><span className="admin-muted small">Ngày tạo</span><strong>{new Date(detailStore.createdAt).toLocaleDateString('vi-VN')}</strong><span className="admin-muted small">mốc khởi tạo hồ sơ</span></div></div></PanelDrawerSection>
          <PanelDrawerSection title="Mô tả gian hàng"><p className="admin-muted store-description">{detailStore.description || 'Chưa có mô tả gian hàng.'}</p></PanelDrawerSection>
          <PanelDrawerSection title="Ghi chú kiểm duyệt">{detailStore.approvalStatus === 'PENDING' || detailStore.approvalStatus === 'REJECTED' ? (<textarea className="admin-textarea store-reject-note" rows={4} placeholder="Nhập ghi chú hoặc lý do từ chối hồ sơ gian hàng" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />) : (<div className="admin-card-list"><div className="admin-card-row"><span className="admin-bold">Ghi chú hiện tại</span><span className="admin-muted">{detailStore.rejectionReason || 'Chưa có ghi chú kiểm duyệt. Gian hàng đang hoạt động bình thường.'}</span></div></div>)}</PanelDrawerSection></div>
          <PanelDrawerFooter><button className="admin-ghost-btn" onClick={() => { setDetailStore(null); setRejectReason(''); }}>Đóng</button>{detailStore.approvalStatus === 'PENDING' ? <button className="admin-ghost-btn danger" disabled={actionLoading} onClick={() => void rejectStore()}><X size={14} />Từ chối hồ sơ</button> : null}{detailStore.approvalStatus === 'PENDING' ? <button className="admin-primary-btn" disabled={actionLoading} onClick={() => openConfirm('approve', [detailStore.id])}><Check size={14} />Duyệt gian hàng</button> : null}{detailStore.approvalStatus === 'APPROVED' && detailStore.operatingStatus === 'ACTIVE' ? <button className="admin-ghost-btn danger" onClick={() => openConfirm('suspend', [detailStore.id])}><Ban size={14} />Tạm khóa gian hàng</button> : null}{detailStore.approvalStatus === 'APPROVED' && detailStore.operatingStatus === 'SUSPENDED' ? <button className="admin-primary-btn" onClick={() => openConfirm('reactivate', [detailStore.id])}><RotateCcw size={14} />Mở lại gian hàng</button> : null}</PanelDrawerFooter></>) : null}</Drawer>
    </AdminLayout>
  );
};

export default StoreApprovals;
