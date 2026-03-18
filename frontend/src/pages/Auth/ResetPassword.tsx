import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import './Auth.css';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services/authService';

const ResetPassword = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!password.trim()) next.password = 'Vui lòng nhập mật khẩu mới';
    else if (password.trim().length < 6) next.password = 'Tối thiểu 6 ký tự';
    if (confirm.trim() !== password.trim()) next.confirm = 'Mật khẩu không khớp';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    try {
      setLoading(true);
      await authService.reset(password.trim());
      addToast('Đặt lại mật khẩu thành công (mock)', 'success');
      navigate('/login', { replace: true });
    } catch (err: any) {
      addToast(err?.message || 'Đặt lại mật khẩu thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Đặt lại mật khẩu</h1>
        <p className="auth-subtitle">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label>Mật khẩu mới</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {errors.password && <div className="auth-error">{errors.password}</div>}
          </div>

          <div className="auth-field">
            <label>Nhập lại mật khẩu</label>
            <input
              className="auth-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
            {errors.confirm && <div className="auth-error">{errors.confirm}</div>}
          </div>

          <div className="auth-actions">
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <><Loader2 size={18} className="auth-spinner" /> Đang đặt lại...</> : <><LockKeyhole size={18} /> Đặt lại mật khẩu</>}
            </button>
            <div className="auth-secondary">
              Nhớ mật khẩu rồi? <Link to="/login">Đăng nhập</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
