import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import './Auth.css';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services/authService';

const ForgotPassword = () => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    setError(null);
    try {
      setLoading(true);
      await authService.forgot(email.trim());
      addToast('Đã gửi hướng dẫn đặt lại mật khẩu (mock)', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gửi yêu cầu thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Quên mật khẩu</h1>
        <p className="auth-subtitle">Nhập email để nhận hướng dẫn đặt lại mật khẩu.</p>

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
            {error && <div className="auth-error">{error}</div>}
          </div>

          <div className="auth-actions">
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <><Loader2 size={18} className="auth-spinner" /> Đang gửi...</> : <><Mail size={18} /> Gửi hướng dẫn</>}
            </button>
            <div className="auth-secondary">
              Đã nhớ mật khẩu? <Link to="/login">Đăng nhập</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
