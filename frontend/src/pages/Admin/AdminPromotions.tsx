import './Admin.css';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Ticket, Pencil, Pause, Play, X, Tag, Copy, Activity, Clock3, PauseCircle, Gauge, Link2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { AdminStateBlock, AdminTableSkeleton } from './AdminStateBlocks';
import { useAdminListState } from './useAdminListState';
import { ADMIN_VIEW_KEYS, clearPersistedAdminView, getPersistedAdminView, setPersistedAdminView, shareAdminViewUrl } from './adminListView';

type PromotionStatus = 'running' | 'expired' | 'paused';
type DiscountType = 'percent' | 'fixed';

interface Promotion {
  id: string;
  name: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number;
  minOrderValue: number;
  userLimit: number;
  totalIssued: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
}

const initialPromotions: Promotion[] = [
  {
    id: 'pr-001',
    name: 'Summer Flash Sale',
    code: 'SUMMER20',
    description: 'Chiến dịch hè giảm sâu cho nhóm sản phẩm bán chạy.',
    discountType: 'percent',
    discountValue: 20,
    maxDiscount: 200000,
    minOrderValue: 500000,
    userLimit: 2,
    totalIssued: 3000,
    usedCount: 1820,
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    status: 'running',
  },
  {
    id: 'pr-002',
    name: 'Welcome New User',
    code: 'HELLO100K',
    description: 'Voucher chào mừng khách hàng mới.',
    discountType: 'fixed',
    discountValue: 100000,
    maxDiscount: 100000,
    minOrderValue: 699000,
    userLimit: 1,
    totalIssued: 5000,
    usedCount: 4960,
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'expired',
  },
  {
    id: 'pr-003',
    name: 'Weekend Promo',
    code: 'WKND50',
    description: 'Ưu đãi cuối tuần cho toàn bộ danh mục.',
    discountType: 'fixed',
    discountValue: 50000,
    maxDiscount: 50000,
    minOrderValue: 399000,
    userLimit: 3,
    totalIssued: 4500,
    usedCount: 820,
    startDate: '2026-06-01',
    endDate: '2026-07-30',
    status: 'paused',
  },
];

const emptyPromotion: Promotion = {
  id: '',
  name: '',
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  maxDiscount: 100000,
  minOrderValue: 500000,
  userLimit: 1,
  totalIssued: 1000,
  usedCount: 0,
  startDate: '',
  endDate: '',
  status: 'running',
};

const formatCurrencyVnd = (value: number) => `${value.toLocaleString('vi-VN')} đ`;
const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const statusLabel = (status: PromotionStatus) => {
  if (status === 'running') return 'Đang chạy';
  if (status === 'paused') return 'Tạm dừng';
  return 'Hết hạn';
};

const statusClass = (status: PromotionStatus) => {
  if (status === 'running') return 'promo-status-running';
  if (status === 'paused') return 'promo-status-paused';
  return 'promo-status-expired';
};

const discountTypeLabel = (type: DiscountType) => (type === 'percent' ? 'Giảm theo %' : 'Giảm tiền mặt');

const deriveStatus = (promotion: Promotion): PromotionStatus => {
  if (promotion.status === 'paused') return 'paused';
  const startDate = new Date(promotion.startDate);
  const endDate = new Date(promotion.endDate);
  if (Number.isNaN(endDate.getTime())) return 'paused';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!Number.isNaN(startDate.getTime())) {
    startDate.setHours(0, 0, 0, 0);
    if (startDate > today) return 'paused';
  }
  endDate.setHours(0, 0, 0, 0);
  if (endDate < today) return 'expired';
  return 'running';
};

const buildDuplicateCode = (sourceCode: string, existingCodes: Set<string>) => {
  const clean = sourceCode.toUpperCase().replace(/-COPY\d*$/, '');
  let candidate = `${clean}-COPY`;
  let count = 1;
  while (existingCodes.has(candidate)) {
    candidate = `${clean}-COPY${count}`;
    count += 1;
  }
  return candidate;
};

const validatePromotionForm = (form: Promotion, rows: Promotion[], editingId: string | null) => {
  const errors: Partial<Record<'name' | 'code' | 'discountValue' | 'maxDiscount' | 'minOrderValue' | 'userLimit' | 'totalIssued' | 'startDate' | 'endDate', string>> = {};

  if (!form.name.trim()) errors.name = 'Tên chiến dịch không được để trống.';
  if (!form.code.trim()) {
    errors.code = 'Mã voucher không được để trống.';
  } else if (!/^[A-Z0-9-]{4,24}$/.test(form.code)) {
    errors.code = 'Mã chỉ gồm chữ in hoa, số, dấu gạch ngang (4-24 ký tự).';
  } else {
    const duplicated = rows.some((item) => item.code === form.code && item.id !== editingId);
    if (duplicated) errors.code = 'Mã voucher đã tồn tại.';
  }

  if (form.discountValue <= 0) errors.discountValue = 'Giá trị giảm phải lớn hơn 0.';
  if (form.discountType === 'percent' && form.discountValue > 100) errors.discountValue = 'Giảm theo % không được vượt quá 100%.';

  if (form.maxDiscount <= 0) errors.maxDiscount = 'Giảm tối đa phải lớn hơn 0.';
  if (form.discountType === 'fixed' && form.maxDiscount < form.discountValue) {
    errors.maxDiscount = 'Giảm tối đa phải lớn hơn hoặc bằng giá trị giảm tiền mặt.';
  }

  if (form.minOrderValue <= 0) errors.minOrderValue = 'Đơn tối thiểu phải lớn hơn 0.';
  if (form.userLimit < 1) errors.userLimit = 'Giới hạn mỗi user tối thiểu là 1.';
  if (form.totalIssued < 1) errors.totalIssued = 'Tổng số lượng phát hành tối thiểu là 1.';
  if (form.usedCount > form.totalIssued) errors.totalIssued = 'Tổng phát hành phải lớn hơn hoặc bằng số lượng đã dùng.';

  if (!form.startDate) errors.startDate = 'Vui lòng chọn ngày bắt đầu.';
  if (!form.endDate) errors.endDate = 'Vui lòng chọn ngày kết thúc.';
  if (form.startDate && form.endDate) {
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) errors.endDate = 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.';
  }

  return errors;
};

const AdminPromotions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchQuery = searchParams.get('q') || '';
  const [rows, setRows] = useState<Promotion[]>(initialPromotions);
  const [statusFilter, setStatusFilter] = useState<'all' | PromotionStatus>(() => {
    const queryStatus = searchParams.get('status') || '';
    if (queryStatus === 'running' || queryStatus === 'paused' || queryStatus === 'expired' || queryStatus === 'all') {
      return queryStatus as 'all' | PromotionStatus;
    }
    const persisted = getPersistedAdminView(ADMIN_VIEW_KEYS.promotions);
    if (persisted === 'running' || persisted === 'paused' || persisted === 'expired' || persisted === 'all') {
      return persisted as 'all' | PromotionStatus;
    }
    return 'all';
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Promotion>(emptyPromotion);
  const [toast, setToast] = useState('');

  const {
    search,
    setSearch,
    isLoading,
    filteredItems: filtered,
    pagedItems: pagedPromotions,
    page,
    totalPages,
    startIndex,
    endIndex,
    next,
    prev,
    setPage,
    clearFilters,
  } = useAdminListState<Promotion>({
    items: rows,
    pageSize: 7,
    initialSearch: initialSearchQuery,
    getSearchText: (item) => `${item.name} ${item.code} ${item.description}`,
    filterPredicate: (item) => {
      const currentStatus = deriveStatus(item);
      return statusFilter === 'all' || currentStatus === statusFilter;
    },
    loadingDeps: [statusFilter],
  });

  useEffect(() => {
    setPersistedAdminView(ADMIN_VIEW_KEYS.promotions, statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    const queryStatus = searchParams.get('status');
    if (!queryStatus) return;
    if ((queryStatus === 'running' || queryStatus === 'paused' || queryStatus === 'expired' || queryStatus === 'all') && queryStatus !== statusFilter) {
      setStatusFilter(queryStatus as 'all' | PromotionStatus);
    }
  }, [searchParams, statusFilter]);

  useEffect(() => {
    const querySearch = searchParams.get('q') || '';
    if (querySearch !== search) {
      setSearch(querySearch);
    }
  }, [searchParams, search, setSearch]);

  const changeStatusFilter = (nextStatus: 'all' | PromotionStatus) => {
    setStatusFilter(nextStatus);
    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus === 'all') nextParams.delete('status');
    else nextParams.set('status', nextStatus);
    setSearchParams(nextParams);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) nextParams.set('q', value.trim());
    else nextParams.delete('q');
    if (statusFilter === 'all') nextParams.delete('status');
    else nextParams.set('status', statusFilter);
    setSearchParams(nextParams);
  };

  const shareCurrentView = async () => {
    try {
      await shareAdminViewUrl(`/admin/promotions${window.location.search}`);
      pushToast('Đã copy link view hiện tại.');
    } catch {
      pushToast('Không thể copy link, vui lòng thử lại.');
    }
  };

  const resetCurrentView = () => {
    clearFilters();
    setStatusFilter('all');
    setSearchParams({});
    clearPersistedAdminView(ADMIN_VIEW_KEYS.promotions);
    pushToast('Đã đặt lại view khuyến mãi về mặc định.');
  };

  const hasViewContext = statusFilter !== 'all' || Boolean(search.trim());
  const statusFilterLabel = statusFilter === 'all' ? 'Tất cả' : statusFilter === 'running' ? 'Đang chạy' : statusFilter === 'paused' ? 'Tạm dừng' : 'Hết hạn';

  const stats = useMemo(() => {
    const statusRows = rows.map((item) => ({ ...item, derivedStatus: deriveStatus(item) }));
    const running = statusRows.filter((item) => item.derivedStatus === 'running').length;
    const paused = statusRows.filter((item) => item.derivedStatus === 'paused').length;
    const expired = statusRows.filter((item) => item.derivedStatus === 'expired').length;
    const totalIssued = statusRows.reduce((sum, item) => sum + item.totalIssued, 0);
    const totalUsed = statusRows.reduce((sum, item) => sum + item.usedCount, 0);
    const usageRate = totalIssued > 0 ? Math.round((totalUsed / totalIssued) * 100) : 0;
    return { running, paused, expired, usageRate };
  }, [rows]);

  const formErrors = useMemo(() => validatePromotionForm(form, rows, editingId), [form, rows, editingId]);
  const hasFormError = Object.keys(formErrors).length > 0;
  const isCodeDuplicated = Boolean(formErrors.code && formErrors.code.includes('tồn tại'));

  const openCreateDrawer = () => {
    setEditingId(null);
    setForm(emptyPromotion);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (promotion: Promotion) => {
    setEditingId(promotion.id);
    setForm({
      ...promotion,
      status: promotion.status === 'expired' ? 'running' : promotion.status,
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingId(null);
  };

  const pushToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  };

  const savePromotion = () => {
    const errors = validatePromotionForm(form, rows, editingId);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      if (firstError) pushToast(firstError);
      return;
    }

    if (editingId) {
      setRows((prev) => prev.map((item) => (item.id === editingId ? { ...form, id: editingId } : item)));
      pushToast('Đã cập nhật chiến dịch khuyến mãi');
    } else {
      const newPromotion: Promotion = {
        ...form,
        id: `pr-${Date.now()}`,
      };
      setRows((prev) => [newPromotion, ...prev]);
      pushToast('Đã tạo mã khuyến mãi mới');
    }

    closeDrawer();
  };

  const togglePause = (id: string) => {
    setRows((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === 'paused' ? 'running' : 'paused',
            }
          : item,
      ),
    );
  };

  const duplicatePromotion = (id: string) => {
    const source = rows.find((item) => item.id === id);
    if (!source) return;

    const existingCodes = new Set(rows.map((item) => item.code));
    const duplicateCode = buildDuplicateCode(source.code, existingCodes);
    const duplicated: Promotion = {
      ...source,
      id: `pr-${Date.now()}`,
      name: `${source.name} (Bản sao)`,
      code: duplicateCode,
      usedCount: 0,
      status: 'paused',
    };

    setRows((prev) => [duplicated, ...prev]);
    pushToast(`Đã nhân bản voucher ${source.code} thành ${duplicateCode}`);
  };

  return (
    <AdminLayout
      title="Khuyến mãi"
      actions={
        <>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm theo tên chiến dịch, mã voucher..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          </div>
          <Link to="#" className="admin-ghost-btn"><Tag size={16} /> Loại khuyến mãi</Link>
          <button className="admin-ghost-btn" onClick={shareCurrentView}><Link2 size={16} /> Share view</button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Reset view</button>
          <button className="admin-primary-btn" onClick={openCreateDrawer}><Plus size={16} /> Tạo mã mới</button>
        </>
      }
    >
      <section className="promo-insights-grid">
        <motion.article className="promo-insight-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <div className="promo-insight-head">
            <Activity size={16} />
            <span>Đang chạy</span>
          </div>
          <p>{stats.running} chiến dịch</p>
        </motion.article>

        <motion.article className="promo-insight-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.04 }}>
          <div className="promo-insight-head">
            <PauseCircle size={16} />
            <span>Tạm dừng</span>
          </div>
          <p>{stats.paused} chiến dịch</p>
        </motion.article>

        <motion.article className="promo-insight-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.08 }}>
          <div className="promo-insight-head">
            <Clock3 size={16} />
            <span>Hết hạn</span>
          </div>
          <p>{stats.expired} chiến dịch</p>
        </motion.article>

        <motion.article className="promo-insight-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.12 }}>
          <div className="promo-insight-head">
            <Gauge size={16} />
            <span>Tỷ lệ sử dụng</span>
          </div>
          <p>{stats.usageRate}%</p>
        </motion.article>
      </section>

      <div className="admin-tabs">
        <button className={`admin-tab ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => changeStatusFilter('all')}>Tất cả</button>
        <button className={`admin-tab ${statusFilter === 'running' ? 'active' : ''}`} onClick={() => changeStatusFilter('running')}>Đang chạy</button>
        <button className={`admin-tab ${statusFilter === 'paused' ? 'active' : ''}`} onClick={() => changeStatusFilter('paused')}>Tạm dừng</button>
        <button className={`admin-tab ${statusFilter === 'expired' ? 'active' : ''}`} onClick={() => changeStatusFilter('expired')}>Hết hạn</button>
      </div>

      {hasViewContext && (
        <div className="admin-view-summary">
          <span className="summary-chip">Trạng thái: {statusFilterLabel}</span>
          {search.trim() && <span className="summary-chip">Từ khóa: {search.trim()}</span>}
          <button className="summary-clear" onClick={resetCurrentView}>Xóa bộ lọc</button>
        </div>
      )}

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>
              <Ticket size={16} /> Danh sách voucher
            </h2>
            <span className="admin-muted">{filtered.length} chiến dịch</span>
          </div>

          {isLoading ? (
            <AdminTableSkeleton columns={8} rows={6} />
          ) : filtered.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không tìm thấy chiến dịch phù hợp' : 'Chưa có chiến dịch khuyến mãi nào'}
              description={search.trim() ? 'Hãy thử thay đổi từ khóa hoặc tab trạng thái.' : 'Tạo voucher đầu tiên để bắt đầu vận hành chiến dịch sale.'}
              actionLabel="Đặt lại bộ lọc"
              onAction={resetCurrentView}
            />
          ) : (
          <div className="admin-table" role="table" aria-label="Danh sách voucher khuyến mãi">
            <div className="admin-table-row admin-table-head promotions" role="row">
              <div role="columnheader">Tên voucher</div>
              <div role="columnheader">Loại giảm giá</div>
              <div role="columnheader">Giá trị</div>
              <div role="columnheader">Điều kiện</div>
              <div role="columnheader">Số lượng</div>
              <div role="columnheader">Thời gian</div>
              <div role="columnheader">Trạng thái</div>
              <div role="columnheader">Hành động</div>
            </div>

            {pagedPromotions.map((promo, idx) => {
              const usedPercent = promo.totalIssued > 0 ? Math.min(100, Math.round((promo.usedCount / promo.totalIssued) * 100)) : 0;
              const currentStatus = deriveStatus(promo);
              return (
                <motion.div
                  key={promo.id}
                  className="admin-table-row promotions"
                  role="row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.18) }}
                  whileHover={{ y: -1 }}
                >
                  <div role="cell">
                    <p className="admin-bold promo-name">{promo.name}</p>
                    <p className="admin-muted promo-code">{promo.code}</p>
                  </div>
                  <div role="cell">{discountTypeLabel(promo.discountType)}</div>
                  <div role="cell" className="promo-value-cell">
                    <p className="admin-bold">
                      {promo.discountType === 'percent' ? `${promo.discountValue}%` : formatCurrencyVnd(promo.discountValue)}
                    </p>
                    <p className="admin-muted small">Tối đa {formatCurrencyVnd(promo.maxDiscount)}</p>
                  </div>
                  <div role="cell" className="promo-condition">Đơn &gt; {formatCurrencyVnd(promo.minOrderValue)}</div>
                  <div role="cell">
                    <p className="admin-bold">{promo.usedCount}/{promo.totalIssued}</p>
                    <div className="promo-progress-track"><span style={{ width: `${usedPercent}%` }} /></div>
                  </div>
                  <div role="cell" className="admin-muted">{formatDate(promo.startDate)} - {formatDate(promo.endDate)}</div>
                  <div role="cell"><span className={`admin-pill ${statusClass(currentStatus)}`}>{statusLabel(currentStatus)}</span></div>
                  <div role="cell" className="admin-actions">
                    <button className="admin-icon-btn subtle" title="Chỉnh sửa" onClick={() => openEditDrawer(promo)}><Pencil size={16} /></button>
                    <button className="admin-icon-btn subtle" title="Nhân bản campaign" onClick={() => duplicatePromotion(promo.id)}><Copy size={16} /></button>
                    <button className="admin-icon-btn subtle" title={promo.status === 'paused' ? 'Kích hoạt lại' : 'Tạm dừng'} onClick={() => togglePause(promo.id)}>
                      {promo.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="table-footer">
              <span className="admin-muted">Hiển thị {startIndex}-{endIndex} của {filtered.length} chiến dịch</span>
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
        {isDrawerOpen && (
          <>
            <motion.div className="drawer-overlay" onClick={closeDrawer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.div className="drawer promo-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.25, ease: 'easeOut' }}>
              <div className="drawer-header">
                <div>
                  <p className="drawer-eyebrow">Marketing Campaign</p>
                  <h3>{editingId ? 'Chỉnh sửa mã khuyến mãi' : 'Tạo mã khuyến mãi mới'}</h3>
                </div>
                <button className="admin-icon-btn" onClick={closeDrawer} aria-label="Đóng"><X size={16} /></button>
              </div>

              <div className="drawer-body">
                <section className="drawer-section">
                  <h4>Section 1: Thông tin chung</h4>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Tên chiến dịch</span>
                      <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ví dụ: Summer Flash Sale" />
                    </label>
                    <label className="form-field">
                      <span>Mã voucher</span>
                      <input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))} placeholder="VD: SUMMER20" />
                      {isCodeDuplicated && <small className="promo-field-error">Mã voucher này đã tồn tại trong hệ thống.</small>}
                      {formErrors.code && !isCodeDuplicated && <small className="promo-field-error">{formErrors.code}</small>}
                    </label>
                    <label className="form-field full">
                      <span>Mô tả chiến dịch</span>
                      <textarea rows={3} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Mô tả ngắn gọn mục tiêu và đối tượng áp dụng..." />
                    </label>
                  </div>
                </section>

                <section className="drawer-section">
                  <h4>Section 2: Cấu hình giảm giá</h4>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Loại giảm giá</span>
                      <select value={form.discountType} onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))}>
                        <option value="percent">Giảm theo %</option>
                        <option value="fixed">Giảm tiền mặt</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Giá trị</span>
                      <input type="number" value={form.discountValue} onChange={(e) => setForm((prev) => ({ ...prev, discountValue: Number(e.target.value) || 0 }))} />
                      {formErrors.discountValue && <small className="promo-field-error">{formErrors.discountValue}</small>}
                    </label>
                    <label className="form-field">
                      <span>Giảm tối đa (VNĐ)</span>
                      <input type="number" value={form.maxDiscount} onChange={(e) => setForm((prev) => ({ ...prev, maxDiscount: Number(e.target.value) || 0 }))} />
                      {formErrors.maxDiscount && <small className="promo-field-error">{formErrors.maxDiscount}</small>}
                    </label>
                  </div>
                </section>

                <section className="drawer-section">
                  <h4>Section 3: Điều kiện & Giới hạn</h4>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Đơn tối thiểu (VNĐ)</span>
                      <input type="number" value={form.minOrderValue} onChange={(e) => setForm((prev) => ({ ...prev, minOrderValue: Number(e.target.value) || 0 }))} />
                      {formErrors.minOrderValue && <small className="promo-field-error">{formErrors.minOrderValue}</small>}
                    </label>
                    <label className="form-field">
                      <span>Giới hạn mỗi user</span>
                      <input type="number" value={form.userLimit} onChange={(e) => setForm((prev) => ({ ...prev, userLimit: Number(e.target.value) || 1 }))} />
                      {formErrors.userLimit && <small className="promo-field-error">{formErrors.userLimit}</small>}
                    </label>
                    <label className="form-field">
                      <span>Tổng số lượng phát hành</span>
                      <input type="number" value={form.totalIssued} onChange={(e) => setForm((prev) => ({ ...prev, totalIssued: Number(e.target.value) || 0 }))} />
                      {formErrors.totalIssued && <small className="promo-field-error">{formErrors.totalIssued}</small>}
                    </label>
                  </div>
                </section>

                <section className="drawer-section">
                  <h4>Section 4: Lịch trình</h4>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Ngày bắt đầu</span>
                      <input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
                      {formErrors.startDate && <small className="promo-field-error">{formErrors.startDate}</small>}
                    </label>
                    <label className="form-field">
                      <span>Ngày kết thúc</span>
                      <input type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} />
                      {formErrors.endDate && <small className="promo-field-error">{formErrors.endDate}</small>}
                    </label>
                    <label className="form-field">
                      <span>Vận hành chiến dịch</span>
                      <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PromotionStatus }))}>
                        <option value="running">Đang chạy</option>
                        <option value="paused">Tạm dừng</option>
                      </select>
                      <small className="admin-muted">Trạng thái Hết hạn sẽ tự động cập nhật theo ngày kết thúc.</small>
                    </label>
                  </div>
                </section>
              </div>

              <div className="drawer-footer">
                <button className="admin-ghost-btn" onClick={closeDrawer}>Hủy</button>
                <button className="admin-primary-btn" onClick={savePromotion} disabled={hasFormError}>{editingId ? 'Lưu thay đổi' : 'Tạo voucher'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {toast && <div className="toast success">{toast}</div>}
    </AdminLayout>
  );
};

export default AdminPromotions;
