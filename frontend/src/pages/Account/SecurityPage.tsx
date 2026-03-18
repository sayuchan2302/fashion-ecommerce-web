import { useState } from 'react';
import './Account.css';
import { useToast } from '../../contexts/ToastContext';

const SecurityPage = () => {
  const { addToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !next) {
      setError('Vui lòng nhập đủ thông tin');
      return;
    }
    if (next.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (next !== confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast('Đã cập nhật mật khẩu (mock)', 'success');
      setCurrent('');
      setNext('');
      setConfirm('');
    }, 500);
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1 className="account-title">Bảo mật tài khoản</h1>
        </div>
        <p className="account-subtitle">Đổi mật khẩu của bạn.</p>

        <form className="account-form-grid" onSubmit={handleSubmit}>
          <div className="account-field">
            <label>Mật khẩu hiện tại</label>
            <input className="account-input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="account-field">
            <label>Mật khẩu mới</label>
            <input className="account-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="account-field">
            <label>Nhập lại mật khẩu mới</label>
            <input className="account-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="account-field" style={{ alignSelf: 'end' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Cập nhật'}
            </button>
            {error && <div className="auth-error" style={{ marginTop: 6 }}>{error}</div>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecurityPage;
