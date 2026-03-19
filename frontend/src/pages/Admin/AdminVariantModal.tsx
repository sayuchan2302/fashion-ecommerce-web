import './Admin.css';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface VariantRow {
  id: string;
  size: string;
  color: string;
  sku: string;
  price: string;
  stock: string;
}

const AdminVariantModal = ({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) => {
  const baseSku = 'POLO-001';
  const [sizes, setSizes] = useState<string[]>(['S', 'M', 'L']);
  const [colors, setColors] = useState<string[]>(['Đen', 'Trắng']);
  const [matrix, setMatrix] = useState<VariantRow[]>([]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addSize = (value: string) => {
    const v = value.trim();
    if (v && !sizes.includes(v)) setSizes([...sizes, v]);
  };

  const addColor = (value: string) => {
    const v = value.trim();
    if (v && !colors.includes(v)) setColors([...colors, v]);
  };

  const slug = (v: string) => v.replace(/\s+/g, '-').toUpperCase();

  const buildMatrix = () => {
    if (!sizes.length || !colors.length) {
      setMatrix([]);
      return;
    }
    const prev = new Map(matrix.map(r => [r.id, r]));
    const combos: VariantRow[] = [];
    sizes.forEach(size => {
      colors.forEach(color => {
        const id = `${size}-${color}`;
        const existing = prev.get(id);
        combos.push({
          id,
          size,
          color,
          sku: existing?.sku || `${baseSku}-${slug(color)}-${slug(size)}`,
          price: existing?.price || '350000',
          stock: existing?.stock || '10',
        });
      });
    });
    setMatrix(combos);
  };

  const applyBulk = () => {
    setMatrix(prev => prev.map(row => ({
      ...row,
      price: bulkPrice || row.price,
      stock: bulkStock || row.stock,
    })));
  };

  const updateRow = (id: string, field: keyof VariantRow, value: string) => {
    setMatrix(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSaved();
    }, 800);
  };

  useEffect(() => {
    buildMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes, colors]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="drawer-eyebrow">Quản lý Size & Màu sắc</p>
            <h3>Variant Matrix</h3>
          </div>
          <button className="admin-icon-btn" onClick={onClose} aria-label="Đóng"><X size={16} /></button>
        </div>

        <div className="modal-body">
          <section className="drawer-section">
            <h4>Thuộc tính</h4>
            <p className="admin-muted small">Nhập tag và ma trận sẽ tự tạo theo Size x Màu.</p>
            <div className="form-grid">
              <label className="form-field">
                <span>Size (tags)</span>
                <div className="tag-input dashed">
                  {sizes.map(s => <span key={s} className="tag-chip" onClick={() => setSizes(prev => prev.filter(x => x !== s))}>{s} ×</span>)}
                  <input
                    placeholder="Nhập size và Enter"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSize((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </label>
              <label className="form-field">
                <span>Màu sắc (tags)</span>
                <div className="tag-input dashed">
                  {colors.map(c => <span key={c} className="tag-chip" onClick={() => setColors(prev => prev.filter(x => x !== c))}>{c} ×</span>)}
                  <input
                    placeholder="Nhập màu và Enter"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addColor((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="drawer-section">
            {matrix.length === 0 ? (
              <p className="admin-muted">Vui lòng nhập Size và Màu để bắt đầu tạo ma trận.</p>
            ) : (
              <div className="variant-table-wrap">
                <div className="variant-table" role="table">
                  <div className="variant-head" role="row">
                    <div role="columnheader">Biến thể</div>
                    <div role="columnheader">SKU</div>
                    <div role="columnheader">Giá bán</div>
                    <div role="columnheader">Tồn kho</div>
                    <div role="columnheader">Điền nhanh</div>
                  </div>
                  <div className="variant-row variant-quick" role="row">
                    <div role="cell" className="admin-muted">Áp dụng nhanh</div>
                    <div role="cell" className="admin-muted small">Giữ SKU gốc</div>
                    <div role="cell"><input value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} placeholder="vd 350000" /></div>
                    <div role="cell"><input value={bulkStock} onChange={e => setBulkStock(e.target.value)} placeholder="vd 20" /></div>
                    <div role="cell"><button className="admin-ghost-btn" onClick={applyBulk}>Điền tất cả</button></div>
                  </div>
                  {matrix.map(row => (
                    <div key={row.id} className={`variant-row ${parseInt(row.stock || '0', 10) === 0 ? 'variant-zero' : ''}`} role="row">
                      <div role="cell">{row.color} / {row.size}</div>
                      <div role="cell"><input value={row.sku} onChange={e => updateRow(row.id, 'sku', e.target.value)} /></div>
                      <div role="cell"><input value={row.price} onChange={e => updateRow(row.id, 'price', e.target.value)} /></div>
                      <div role="cell"><input value={row.stock} onChange={e => updateRow(row.id, 'stock', e.target.value)} /></div>
                      <div role="cell" className="row-hint">{parseInt(row.stock || '0', 10) === 0 ? 'Hết hàng' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="drawer-footer">
          <button className="admin-ghost-btn" onClick={onClose}>Hủy</button>
          <button className="admin-primary-btn" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
        </div>
      </div>
    </div>
  );
};

export default AdminVariantModal;
