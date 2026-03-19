import './Admin.css';
import { Link } from 'react-router-dom';
import { Filter, Search, Plus, Pencil, Layers, Trash2, ArrowUpDown, X } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useMemo, useState } from 'react';
import AdminVariantModal from './AdminVariantModal';

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

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang bán' },
  { key: 'low', label: 'Sắp hết' },
  { key: 'out', label: 'Hết hàng' },
];

const AdminProducts = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState(initialProducts);
  const [editingPrice, setEditingPrice] = useState<{ sku: string; value: string } | null>(null);
  const [editingStock, setEditingStock] = useState<{ sku: string; value: string } | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [toast, setToast] = useState<string>('');
  const [showVariants, setShowVariants] = useState(false);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return rows;
    return rows.filter(p => p.statusType === activeTab);
  }, [activeTab, rows]);

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
    setRows(prev => prev.map(p => p.sku === editingStock.sku ? { ...p, stock: value } : p));
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

  return (
    <AdminLayout
      title="Sản phẩm"
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm tên, SKU..." />
          </div>
          <button className="admin-ghost-btn"><Filter size={16} /> Bộ lọc</button>
          <Link to="#" className="admin-primary-btn"> <Plus size={16} /> Thêm sản phẩm</Link>
        </>
      )}
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

      {selected.size > 0 && (
        <div className="admin-bulk-bar">
          <span>{selected.size} sản phẩm được chọn</span>
          <div className="admin-actions">
            <button className="admin-ghost-btn">Đổi trạng thái</button>
            <button className="admin-ghost-btn">Xuất Excel</button>
            <button className="admin-ghost-btn danger">Xóa</button>
          </div>
        </div>
      )}

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-table" role="table" aria-label="Danh sách sản phẩm">
            <div className="admin-table-row admin-table-head products" role="row">
              <div role="columnheader"><input type="checkbox" aria-label="Chọn tất cả" checked={selected.size === filtered.length && filtered.length > 0} onChange={e => toggleAll(e.target.checked)} /></div>
              <div role="columnheader">Sản phẩm</div>
              <div role="columnheader">Danh mục</div>
              <div role="columnheader" className="sortable">Giá <ArrowUpDown size={14} /></div>
              <div role="columnheader" className="sortable">Tồn kho <ArrowUpDown size={14} /></div>
              <div role="columnheader">Trạng thái</div>
              <div role="columnheader">Hành động</div>
            </div>
            {filtered.map(p => (
              <div className="admin-table-row products" role="row" key={p.sku}>
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
              </div>
            ))}
          </div>
          <div className="table-footer">
            <span className="admin-muted">Hiển thị 1-10 của 120 sản phẩm</span>
            <div className="pagination">
              <button className="page-btn active">1</button>
              <button className="page-btn">2</button>
              <button className="page-btn">3</button>
              <button className="page-btn">Tiếp</button>
            </div>
          </div>
        </div>
      </section>

      {showDrawer && (
        <div className="modal-overlay" onClick={closeDrawer}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="drawer-eyebrow">Chỉnh sửa sản phẩm</p>
                <h3>#POLO-001</h3>
              </div>
              <button className="admin-icon-btn" onClick={closeDrawer} aria-label="Đóng"><X size={16} /></button>
            </div>

            <div className="modal-body">
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
                    <input type="number" defaultValue={359000} />
                  </label>
                  <label className="form-field">
                    <span>Giá khuyến mãi</span>
                    <input type="number" defaultValue={329000} />
                  </label>
                </div>
                <div>
                  <h4>Tồn kho</h4>
                  <label className="form-field">
                    <span>Số lượng</span>
                    <input type="number" defaultValue={42} />
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
            </div>

            <div className="modal-footer">
              <button className="admin-ghost-btn" onClick={closeDrawer}>Hủy</button>
              <button className="admin-primary-btn" onClick={handleSaveDrawer}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast success">{toast}</div>}
      {showVariants && <AdminVariantModal onClose={closeVariants} onSaved={() => { setToast('Lưu cấu hình biến thể thành công'); setTimeout(() => setToast(''), 2000); }} />}
    </AdminLayout>
  );
};

export default AdminProducts;
