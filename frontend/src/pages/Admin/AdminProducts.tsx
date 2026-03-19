import './Admin.css';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Search, Plus, Pencil, Layers, Trash2, ArrowUpDown, X, Link2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AdminVariantModal from './AdminVariantModal';
import type { VariantRow } from './AdminVariantModal';
import { AdminStateBlock, AdminTableSkeleton } from './AdminStateBlocks';
import { useAdminListState } from './useAdminListState';
import { ADMIN_VIEW_KEYS, clearPersistedAdminView, getPersistedAdminView, setPersistedAdminView, shareAdminViewUrl } from './adminListView';

const initialProducts = [
  { sku: 'POLO-001', name: 'Áo Polo Cotton Khử Mùi', category: 'Áo Polo', price: 359000, stock: 42, status: 'Đang bán', variants: '3 sizes · 4 colors', thumb: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=140&h=170&q=80', statusType: 'active' },
  { sku: 'JEAN-023', name: 'Quần Jeans Slim', category: 'Quần Jeans', price: 699000, stock: 8, status: 'Sắp hết', variants: '5 sizes · 2 colors', thumb: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=140&h=170&q=80', statusType: 'low' },
  { sku: 'TEE-105', name: 'Áo Thun Basic', category: 'Áo Thun', price: 199000, stock: 0, status: 'Hết hàng', variants: '4 sizes · 6 colors', thumb: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=140&h=170&q=80', statusType: 'out' },
  { sku: 'ACC-501', name: 'Thắt Lưng Da', category: 'Phụ kiện', price: 249000, stock: 88, status: 'Đang bán', variants: '1 size · 3 colors', thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=140&h=170&q=80', statusType: 'active' },
];

const statusTone = (type: string) => {
  if (type === 'low') return 'warning';
  if (type === 'out') return 'neutral';
  return 'success';
};

const getStatusFromStock = (stock: number) => {
  if (stock <= 0) return { status: 'Hết hàng', statusType: 'out' as const };
  if (stock < 10) return { status: 'Sắp hết', statusType: 'low' as const };
  return { status: 'Đang bán', statusType: 'active' as const };
};

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'stock-alert', label: 'Cảnh báo kho' },
  { key: 'active', label: 'Đang bán' },
  { key: 'low', label: 'Sắp hết' },
  { key: 'out', label: 'Hết hàng' },
];

const validProductTabs = new Set(tabs.map((tab) => tab.key));

const AdminProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchQuery = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<string>(() => {
    const queryTab = searchParams.get('status') || searchParams.get('view') || '';
    if (validProductTabs.has(queryTab)) return queryTab;
    const persisted = getPersistedAdminView(ADMIN_VIEW_KEYS.products) || 'all';
    return validProductTabs.has(persisted) ? persisted : 'all';
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState(initialProducts);
  const [editingPrice, setEditingPrice] = useState<{ sku: string; value: string } | null>(null);
  const [editingStock, setEditingStock] = useState<{ sku: string; value: string } | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [toast, setToast] = useState<string>('');
  const [showVariants, setShowVariants] = useState(false);
  const initialVariantRows: VariantRow[] = [
    { id: 'S-Đen', size: 'S', color: 'Đen', sku: 'POLO-001-DEN-S', price: '350000', stock: '12' },
    { id: 'M-Đen', size: 'M', color: 'Đen', sku: 'POLO-001-DEN-M', price: '350000', stock: '10' },
    { id: 'L-Đen', size: 'L', color: 'Đen', sku: 'POLO-001-DEN-L', price: '350000', stock: '8' },
    { id: 'S-Trắng', size: 'S', color: 'Trắng', sku: 'POLO-001-TRANG-S', price: '350000', stock: '6' },
    { id: 'M-Trắng', size: 'M', color: 'Trắng', sku: 'POLO-001-TRANG-M', price: '350000', stock: '4' },
    { id: 'L-Trắng', size: 'L', color: 'Trắng', sku: 'POLO-001-TRANG-L', price: '350000', stock: '2' },
  ];
  const [variantRows, setVariantRows] = useState<VariantRow[]>(initialVariantRows);
  const [price, setPrice] = useState('359.000');
  const [salePrice, setSalePrice] = useState('329.000');
  const [stock, setStock] = useState('42');
  const [slug, setSlug] = useState('ao-polo-cotton-khu-mui');
  const [metaTitle, setMetaTitle] = useState('Áo Polo Cotton Khử Mùi - Coolmate');
  const {
    search,
    setSearch,
    isLoading,
    filteredItems: filtered,
    pagedItems: pagedProducts,
    page,
    totalPages,
    startIndex,
    endIndex,
    next,
    prev,
    setPage,
    toggleSort,
    clearFilters,
  } = useAdminListState<typeof rows[number]>({
    items: rows,
    pageSize: 8,
    initialSearch: initialSearchQuery,
    getSearchText: (p) => `${p.name} ${p.sku} ${p.category}`,
    filterPredicate: (p) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'stock-alert') return p.stock < 10;
      return p.statusType === activeTab;
    },
    sorters: {
      price: (a, b) => a.price - b.price,
      stock: (a, b) => a.stock - b.stock,
    },
    loadingDeps: [activeTab],
  });

  const hasVariants = variantRows.length > 0;
  const variantStockTotal = useMemo(() => variantRows.reduce((sum, r) => sum + (parseInt(r.stock.replace(/\D/g, ''), 10) || 0), 0), [variantRows]);

  useEffect(() => {
    setPersistedAdminView(ADMIN_VIEW_KEYS.products, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const queryTab = searchParams.get('status') || searchParams.get('view');
    if (!queryTab) return;
    if (validProductTabs.has(queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab);
      setSelected(new Set());
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const querySearch = searchParams.get('q') || '';
    if (querySearch !== search) {
      setSearch(querySearch);
    }
  }, [searchParams, search, setSearch]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) nextParams.set('q', value.trim());
    else nextParams.delete('q');
    if (activeTab === 'all') {
      nextParams.delete('status');
      nextParams.delete('view');
    } else {
      nextParams.set('status', activeTab);
    }
    setSearchParams(nextParams);
  };

  const shareCurrentView = async () => {
    try {
      await shareAdminViewUrl(`/admin/products${window.location.search}`);
      setToast('Đã copy link view hiện tại');
      setTimeout(() => setToast(''), 1800);
    } catch {
      setToast('Không thể copy link, vui lòng thử lại');
      setTimeout(() => setToast(''), 1800);
    }
  };

  const resetCurrentView = () => {
    clearFilters();
    setSelected(new Set());
    setActiveTab('all');
    setSearchParams({});
    clearPersistedAdminView(ADMIN_VIEW_KEYS.products);
    setToast('Đã đặt lại view sản phẩm');
    setTimeout(() => setToast(''), 1800);
  };

  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label || 'Tất cả';
  const hasViewContext = activeTab !== 'all' || Boolean(search.trim());

  const changeTab = (nextTab: string) => {
    setActiveTab(nextTab);
    setSelected(new Set());
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'all') {
      nextParams.delete('status');
      nextParams.delete('view');
    } else {
      nextParams.set('status', nextTab);
    }
    setSearchParams(nextParams);
  };

  const tabCounts = {
    all: rows.length,
    'stock-alert': rows.filter((p) => p.stock < 10).length,
    active: rows.filter((p) => p.statusType === 'active').length,
    low: rows.filter((p) => p.statusType === 'low').length,
    out: rows.filter((p) => p.statusType === 'out').length,
  } as const;

  const formatCurrency = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSlugChange = (val: string) => {
    const clean = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(clean);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filtered.map(p => p.sku)));
    else setSelected(new Set());
  };

  const toggleOne = (sku: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(sku); else next.delete(sku);
    setSelected(next);
  };

  const savePrice = () => {
    if (!editingPrice) return;
    const value = parseInt(editingPrice.value.replace(/\D/g, ''), 10) || 0;
    setRows(prev => prev.map(p => p.sku === editingPrice.sku ? { ...p, price: value } : p));
    setEditingPrice(null);
  };

  const saveStock = () => {
    if (!editingStock) return;
    const value = parseInt(editingStock.value.replace(/\D/g, ''), 10) || 0;
    setRows(prev => prev.map(p => {
      if (p.sku !== editingStock.sku) return p;
      const nextStatus = getStatusFromStock(value);
      return { ...p, stock: value, ...nextStatus };
    }));
    setEditingStock(null);
  };

  const openDrawer = () => setShowDrawer(true);
  const closeDrawer = () => setShowDrawer(false);

  const handleSaveDrawer = () => {
    setToast('Lưu thành công');
    setShowDrawer(false);
    setTimeout(() => setToast(''), 2000);
  };

  const openVariants = () => setShowVariants(true);
  const closeVariants = () => setShowVariants(false);

  const handleVariantsSaved = (matrix: VariantRow[]) => {
    setVariantRows(matrix);
    setToast('Lưu cấu hình biến thể thành công');
    setTimeout(() => setToast(''), 2000);
  };

  return (
    <AdminLayout
      title="Sản phẩm"
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm tên, SKU..." value={search} onChange={e => handleSearchChange(e.target.value)} />
          </div>
          <button className="admin-ghost-btn"><Filter size={16} /> Bộ lọc</button>
          <button className="admin-ghost-btn" onClick={shareCurrentView}><Link2 size={16} /> Share view</button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Reset view</button>
          <Link to="#" className="admin-primary-btn"> <Plus size={16} /> Thêm sản phẩm</Link>
        </>
      )}
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
          {isLoading ? (
            <AdminTableSkeleton columns={7} rows={6} />
          ) : filtered.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm trong danh sách'}
              description={search.trim() ? 'Thử đổi từ khóa hoặc chuyển tab trạng thái khác.' : 'Thêm sản phẩm mới để bắt đầu quản lý kho và biến thể.'}
              actionLabel="Đặt lại bộ lọc"
              onAction={resetCurrentView}
            />
          ) : (
          <div className="admin-table" role="table" aria-label="Danh sách sản phẩm">
            <div className="admin-table-row admin-table-head products" role="row">
              <div role="columnheader"><input type="checkbox" aria-label="Chọn tất cả" checked={selected.size === filtered.length && filtered.length > 0} onChange={e => toggleAll(e.target.checked)} /></div>
              <div role="columnheader">Sản phẩm</div>
              <div role="columnheader">Danh mục</div>
              <div role="columnheader" className="sortable">
                <button className="sort-trigger" onClick={() => toggleSort('price')}>Giá <ArrowUpDown size={14} /></button>
              </div>
              <div role="columnheader" className="sortable">
                <button className="sort-trigger" onClick={() => toggleSort('stock')}>Tồn kho <ArrowUpDown size={14} /></button>
              </div>
              <div role="columnheader">Trạng thái</div>
              <div role="columnheader">Hành động</div>
            </div>
            {pagedProducts.map((p, idx) => (
              <motion.div
                className="admin-table-row products"
                role="row"
                key={p.sku}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.16) }}
                whileHover={{ y: -1 }}
              >
                <div role="cell"><input type="checkbox" aria-label={`Chọn ${p.sku}`} checked={selected.has(p.sku)} onChange={e => toggleOne(p.sku, e.target.checked)} /></div>
                <div role="cell" className="product-cell">
                  <span className="thumb-wrapper">
                    <img src={p.thumb} alt={p.name} className="product-thumb" />
                    <img src={p.thumb} alt={p.name} className="thumb-preview" />
                  </span>
                  <div>
                    <p className="admin-bold">{p.name}</p>
                    <p className="admin-muted">{p.variants}</p>
                    <p className="admin-muted small">SKU: {p.sku}</p>
                  </div>
                </div>
                <div role="cell"><span className="badge">{p.category}</span></div>
                <div role="cell" className="price-cell">
                  {editingPrice?.sku === p.sku ? (
                    <input
                      className="inline-input"
                      value={editingPrice.value}
                      onChange={e => setEditingPrice({ sku: p.sku, value: e.target.value })}
                      onBlur={savePrice}
                      onKeyDown={e => e.key === 'Enter' && savePrice()}
                      autoFocus
                    />
                  ) : (
                    <button className="inline-edit" onClick={() => setEditingPrice({ sku: p.sku, value: p.price.toString() })}>
                      {p.price.toLocaleString('vi-VN')} đ
                      <Pencil size={14} className="inline-icon" />
                    </button>
                  )}
                </div>
                <div role="cell" className={`stock-cell ${p.stock < 10 ? 'low-stock' : ''}`}>
                  {editingStock?.sku === p.sku ? (
                    <input
                      className="inline-input"
                      value={editingStock.value}
                      onChange={e => setEditingStock({ sku: p.sku, value: e.target.value })}
                      onBlur={saveStock}
                      onKeyDown={e => e.key === 'Enter' && saveStock()}
                      autoFocus
                    />
                  ) : (
                    <button className="inline-edit" onClick={() => setEditingStock({ sku: p.sku, value: p.stock.toString() })}>
                      {p.stock}
                      <Pencil size={14} className="inline-icon" />
                    </button>
                  )}
                </div>
                <div role="cell"><span className={`admin-pill ${statusTone(p.statusType)}`}>{p.status}</span></div>
                <div role="cell" className="admin-actions">
                  <button className="admin-icon-btn subtle" title="Sửa" onClick={openDrawer}><Pencil size={16} /></button>
                  <button className="admin-icon-btn subtle" title="Quản lý size/màu" onClick={openVariants}><Layers size={16} /></button>
                  <button className="admin-icon-btn subtle" title="Xóa"><Trash2 size={16} /></button>
                </div>
              </motion.div>
            ))}
          </div>
          )}
          {!isLoading && filtered.length > 0 && (
            <div className="table-footer">
              <span className="admin-muted">Hiển thị {startIndex}-{endIndex} của {filtered.length} sản phẩm</span>
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
              <span>{selected.size} sản phẩm đã chọn</span>
              <div className="admin-actions">
                <button className="admin-ghost-btn">Đổi trạng thái</button>
                <button className="admin-ghost-btn">Xuất Excel</button>
                <button className="admin-ghost-btn danger">Xóa</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showDrawer && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">Chỉnh sửa sản phẩm</p>
                <h3>#POLO-001</h3>
              </div>
              <button className="admin-icon-btn" onClick={closeDrawer} aria-label="Đóng"><X size={16} /></button>
            </div>

            <div className="drawer-body">
              <section className="drawer-section">
                <h4>Hình ảnh</h4>
                <div className="media-grid">
                  <div className="media-cover">Ảnh đại diện</div>
                  <div className="media-thumb">Ảnh phụ</div>
                  <div className="media-thumb">Ảnh phụ</div>
                  <button className="media-add">+ Thêm ảnh</button>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Thông tin chung</h4>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Tên sản phẩm</span>
                    <input type="text" defaultValue="Áo Polo Cotton Khử Mùi" />
                  </label>
                  <label className="form-field">
                    <span>SKU</span>
                    <input type="text" defaultValue="POLO-001" />
                  </label>
                  <label className="form-field">
                    <span>Danh mục</span>
                    <select defaultValue="polo">
                      <option value="polo">Áo Polo</option>
                      <option value="jeans">Quần Jeans</option>
                      <option value="tee">Áo Thun</option>
                    </select>
                  </label>
                </div>
                <label className="form-field">
                  <span>Mô tả sản phẩm</span>
                  <textarea rows={4} defaultValue="Mô tả ngắn gọn về chất liệu, form và công năng..." />
                </label>
              </section>

              <section className="drawer-section two-col">
                <div>
                  <h4>Giá & Khuyến mãi</h4>
                  <label className="form-field">
                    <span>Giá bán</span>
                    <input
                      type="text"
                      value={price}
                      onChange={e => setPrice(formatCurrency(e.target.value))}
                      inputMode="numeric"
                    />
                  </label>
                  <label className="form-field">
                    <span>Giá khuyến mãi</span>
                    <input
                      type="text"
                      value={salePrice}
                      onChange={e => setSalePrice(formatCurrency(e.target.value))}
                      inputMode="numeric"
                    />
                  </label>
                </div>
                <div>
                  <h4>Tồn kho</h4>
                  <label className="form-field">
                    <span>Số lượng</span>
                    <input
                      type="text"
                      value={hasVariants ? formatCurrency(variantStockTotal.toString()) : stock}
                      onChange={e => setStock(formatCurrency(e.target.value))}
                      inputMode="numeric"
                      disabled={hasVariants}
                      className={hasVariants ? 'disabled-input' : ''}
                    />
                    {hasVariants && <span className="admin-muted small">Tự động tính từ biến thể</span>}
                  </label>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Thuộc tính</h4>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Chất liệu</span>
                    <select defaultValue="cotton">
                      <option value="cotton">Cotton</option>
                      <option value="poly">Polyester</option>
                      <option value="blend">Blend</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Form dáng</span>
                    <select defaultValue="regular">
                      <option value="regular">Regular</option>
                      <option value="slim">Slim</option>
                      <option value="oversize">Oversize</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Giới tính</span>
                    <select defaultValue="unisex">
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="unisex">Unisex</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Tối ưu SEO</h4>
                <div className="form-grid">
                  <label className="form-field">
                    <span>URL Slug</span>
                    <input value={slug} onChange={e => handleSlugChange(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Meta Title</span>
                    <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} />
                  </label>
                </div>
              </section>
            </div>

            <div className="drawer-footer">
              <button className="admin-ghost-btn" onClick={closeDrawer}>Hủy</button>
              <button className="admin-primary-btn" onClick={handleSaveDrawer}>Lưu thay đổi</button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast success">{toast}</div>}
      {showVariants && (
        <AdminVariantModal
          initialMatrix={variantRows}
          onClose={closeVariants}
          onSaved={handleVariantsSaved}
        />
      )}
    </AdminLayout>
  );
};

export default AdminProducts;
