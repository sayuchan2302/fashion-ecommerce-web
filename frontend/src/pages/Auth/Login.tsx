import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import './Auth.css';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const Login = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as any)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Vui lòng nhập email';
    if (!password.trim()) next.password = 'Vui lòng nhập mật khẩu';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    try {
      setLoading(true);
      await login(email.trim(), password.trim());
      addToast('Đăng nhập thành công', 'success');
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      addToast(err?.message || 'Đăng nhập thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Đăng nhập</h1>
        <p className="auth-subtitle">Đăng nhập để tích luỹ quyền lợi và xem đơn hàng của bạn.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label>Email</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            {errors.email && <div className="auth-error">{errors.email}</div>}
          </div>

          <div className="auth-field">
            <label>Mật khẩu</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {errors.password && <div className="auth-error">{errors.password}</div>}
          </div>

          <div className="auth-link-row">
            <span></span>
            <Link to="/forgot">Quên mật khẩu?</Link>
          </div>

          <div className="auth-actions">
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <><Loader2 size={18} className="auth-spinner" /> Đang đăng nhập...</> : 'Đăng nhập'}
            </button>
            <div className="auth-secondary">
              Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
            </div>
            <div className="auth-secondary" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={16} /> Bảo mật thanh toán và thông tin khách hàng
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
