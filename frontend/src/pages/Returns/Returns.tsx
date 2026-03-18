import { useState } from 'react';
import { Check, FileImage, RefreshCw, Upload } from 'lucide-react';
import './Returns.css';
import { useToast } from '../../contexts/ToastContext';

type ReturnItem = {
  id: string;
  name: string;
  variant: string;
  price: number;
  image: string;
  selected: boolean;
};

const mockItems: ReturnItem[] = [
  {
    id: 'i1',
    name: 'Áo Polo Nam Cotton Khử Mùi',
    variant: 'Màu: Đen | Size: L',
    price: 359000,
    image: 'https://media.coolmate.me/cdn-cgi/image/width=320,height=470,quality=85/uploads/February2025/11025595_24_copy_11.jpg',
    selected: true,
  },
  {
    id: 'i2',
    name: 'Quần Jeans Slim Fit',
    variant: 'Màu: Xanh đậm | Size: 32',
    price: 459000,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=320&h=430&fit=crop',
    selected: false,
  },
];

const Returns = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState<ReturnItem[]>(mockItems);
  const [reason, setReason] = useState('size');
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.some(i => i.selected)) {
      addToast('Chọn ít nhất một sản phẩm để đổi/trả', 'error');
      return;
    }
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setSubmitted(true);
      addToast('Đã gửi yêu cầu đổi/trả (mock)', 'success');
    }, 600);
  };

  return (
    <div className="returns-page">
      <div className="returns-container">
        <div className="returns-hero">
          <div>
            <p className="hero-kicker">Đổi/Trả hàng</p>
            <h1 className="hero-title">Tạo yêu cầu đổi/trả nhanh chóng</h1>
            <p className="hero-sub">Chọn sản phẩm, lý do và đính kèm hình ảnh nếu cần.</p>
          </div>
          <div className="hero-icon"><RefreshCw size={42} /></div>
        </div>

        <form className="returns-grid" onSubmit={handleSubmit}>
          <div className="returns-card">
            <h3>Sản phẩm trong đơn</h3>
            <div className="returns-items">
              {items.map(item => (
                <label key={item.id} className={`returns-item ${item.selected ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(item.id)}
                  />
                  <img src={item.image} alt={item.name} />
                  <div className="item-info">
                    <p className="item-name">{item.name}</p>
                    <p className="item-variant">{item.variant}</p>
                    <p className="item-price">{item.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="returns-card">
            <h3>Thông tin đổi/trả</h3>
            <div className="form-stack">
              <div>
                <label>Lý do</label>
                <div className="reason-grid">
                  {[
                    { id: 'size', label: 'Không vừa size' },
                    { id: 'defect', label: 'Lỗi sản phẩm' },
                    { id: 'change', label: 'Đổi mẫu khác' },
                    { id: 'other', label: 'Khác' },
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      className={`reason-chip ${reason === opt.id ? 'active' : ''}`}
                      onClick={() => setReason(opt.id)}
                    >
                      {reason === opt.id && <Check size={14} />} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label>Mô tả chi tiết</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Mô tả tình trạng sản phẩm, mong muốn đổi size/màu..."
                />
              </div>

              <div>
                <label>Ảnh minh họa (tùy chọn)</label>
                <div className="upload-box">
                  <div className="upload-left">
                    <FileImage size={18} />
                    <div>
                      <p className="upload-title">Kéo thả hoặc chọn ảnh</p>
                      <p className="upload-hint">Hỗ trợ JPG, PNG. Tối đa 3 ảnh (mock)</p>
                    </div>
                  </div>
                  <button type="button" className="btn-upload">
                    <Upload size={16} /> Chọn file
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="returns-card">
            <h3>Hình thức xử lý</h3>
            <div className="resolution-list">
              <label className="resolution-item">
                <input type="radio" name="resolution" defaultChecked />
                <div>
                  <p className="resolution-title">Đổi size/màu</p>
                  <p className="resolution-desc">Giữ nguyên sản phẩm, hỗ trợ đổi size/màu nếu còn hàng.</p>
                </div>
              </label>
              <label className="resolution-item">
                <input type="radio" name="resolution" />
                <div>
                  <p className="resolution-title">Trả hàng hoàn tiền</p>
                  <p className="resolution-desc">Hoàn tiền về phương thức thanh toán ban đầu.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="returns-card summary">
            <div className="summary-row">
              <span>Sản phẩm đã chọn</span>
              <strong>{items.filter(i => i.selected).length} sản phẩm</strong>
            </div>
            <div className="summary-row">
              <span>Lý do</span>
              <strong>{reason === 'size' ? 'Không vừa size' : reason === 'defect' ? 'Lỗi sản phẩm' : reason === 'change' ? 'Đổi mẫu khác' : 'Khác'}</strong>
            </div>
            <button type="submit" className="btn-submit" disabled={uploading}>
              {uploading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đổi/trả'}
            </button>
            {submitted && (
              <div className="submitted-note">
                <Check size={16} /> Yêu cầu đã gửi thành công (mock) — chúng tôi sẽ liên hệ để hướng dẫn quy trình hoàn hàng.
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Returns;
