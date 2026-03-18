import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, Facebook, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

interface LoginErrors {
  email?: string;
  password?: string;
}

interface RegisterErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const AuthModal = ({ isOpen, onClose, initialTab = 'login' }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validation error states
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    // Reset form states
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setLoginErrors({});
    setRegisterErrors({});
    setIsLoading(false);
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    // Reset tab when reopened
    if (isOpen) {
      setActiveTab(initialTab);
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, initialTab]);

  // ─── Validation helpers ───────────────────────────────────────────────────
  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || /^(0[3|5|7|8|9])+([0-9]{8})$/.test(val);

  const validateLogin = (): LoginErrors => {
    const errors: LoginErrors = {};
    if (!email.trim()) errors.email = 'Vui lòng nhập email / số điện thoại';
    else if (!isValidEmail(email.trim())) errors.email = 'Email hoặc số điện thoại không hợp lệ';
    if (!password) errors.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) errors.password = 'Mật khẩu tối thiểu 6 ký tự';
    return errors;
  };

  const validateRegister = (): RegisterErrors => {
    const errors: RegisterErrors = {};
    if (!fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên';
    if (!email.trim()) errors.email = 'Vui lòng nhập email / số điện thoại';
    else if (!isValidEmail(email.trim())) errors.email = 'Email hoặc số điện thoại không hợp lệ';
    if (!password) errors.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) errors.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (!confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
    else if (confirmPassword !== password) errors.confirmPassword = 'Mật khẩu không khớp';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = activeTab === 'login' ? validateLogin() : validateRegister();
    if (activeTab === 'login') {
      setLoginErrors(errors);
    } else {
      setRegisterErrors(errors);
    }
    if (Object.keys(errors).length > 0) return;

    try {
      setIsLoading(true);
      if (activeTab === 'login') {
        await login(email.trim(), password.trim());
        addToast('Đăng nhập thành công', 'success');
      } else {
        await register(fullName.trim(), email.trim(), password.trim());
        addToast('Tạo tài khoản thành công', 'success');
      }
      const redirectTo = (location.state as any)?.from || '/';
      onClose();
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      addToast(err?.message || 'Thao tác thất bại', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error when user types
  const clearLoginError = (field: keyof LoginErrors) => {
    if (loginErrors[field]) setLoginErrors(prev => ({ ...prev, [field]: undefined }));
  };
  const clearRegisterError = (field: keyof RegisterErrors) => {
    if (registerErrors[field]) setRegisterErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const content = (
    <div className="auth-modal-overlay" onClick={onClose} style={{ display: isOpen ? 'flex' : 'none' }}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Đóng">
          <X size={24} />
        </button>

        <div className="auth-tabs">
          <button 
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabChange('login')}
          >
            Đăng nhập
          </button>
          <button 
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => handleTabChange('register')}
          >
            Đăng ký
          </button>
        </div>

        <div className="auth-form-container">
          <div key={activeTab} className="auth-tab-content">
            <p className="auth-subtitle">
              {activeTab === 'login' 
                ? 'Đăng nhập để không bỏ lỡ quyền lợi tích luỹ và hoàn tiền cho bất kỳ đơn hàng nào.'
                : 'Trở thành thành viên Coolmate để nhận nhiều ưu đãi độc quyền.'}
            </p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {activeTab === 'register' && (
                <div className="form-group">
                  <input 
                    type="text" 
                    placeholder="Họ và tên *" 
                    className={`form-input ${registerErrors.fullName ? 'input-error' : ''}`}
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); clearRegisterError('fullName'); }}
                  />
                  {registerErrors.fullName && <span className="field-error">{registerErrors.fullName}</span>}
                </div>
              )}
              
              <div className="form-group">
                <input 
                  type="email" 
                  placeholder="Email / Số điện thoại *" 
                  className={`form-input ${(activeTab === 'login' ? loginErrors.email : registerErrors.email) ? 'input-error' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    activeTab === 'login' ? clearLoginError('email') : clearRegisterError('email');
                  }}
                />
                {activeTab === 'login' && loginErrors.email && <span className="field-error">{loginErrors.email}</span>}
                {activeTab === 'register' && registerErrors.email && <span className="field-error">{registerErrors.email}</span>}
              </div>
              
              <div className="form-group">
                <div className="password-input-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Mật khẩu *" 
                    className={`form-input ${(activeTab === 'login' ? loginErrors.password : registerErrors.password) ? 'input-error' : ''}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      activeTab === 'login' ? clearLoginError('password') : clearRegisterError('password');
                    }}
                  />
                  <button 
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {activeTab === 'login' && loginErrors.password && <span className="field-error">{loginErrors.password}</span>}
                {activeTab === 'register' && registerErrors.password && <span className="field-error">{registerErrors.password}</span>}
                {/* Password strength indicator for register */}
                {activeTab === 'register' && password.length > 0 && (
                  <div className="password-strength">
                    <div className={`strength-bar ${password.length < 6 ? 'weak' : password.length < 10 ? 'medium' : 'strong'}`}></div>
                    <span className="strength-label">
                      {password.length < 6 ? 'Yếu' : password.length < 10 ? 'Trung bình' : 'Mạnh'}
                    </span>
                  </div>
                )}
              </div>

              {activeTab === 'register' && (
                <div className="form-group">
                  <div className="password-input-wrapper">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Nhập lại mật khẩu *" 
                      className={`form-input ${registerErrors.confirmPassword ? 'input-error' : ''}`}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); clearRegisterError('confirmPassword'); }}
                    />
                    <button 
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {registerErrors.confirmPassword && <span className="field-error">{registerErrors.confirmPassword}</span>}
                  {/* Match indicator */}
                  {confirmPassword.length > 0 && (
                    <span className={`match-indicator ${confirmPassword === password ? 'match' : 'no-match'}`}>
                      {confirmPassword === password ? '✓ Mật khẩu khớp' : '✗ Mật khẩu chưa khớp'}
                    </span>
                  )}
                </div>
              )}

              {activeTab === 'login' && (
                <div className="auth-forgot-password">
                  <Link to="/forgot" onClick={onClose}>Quên mật khẩu?</Link>
                </div>
              )}

              <button type="submit" className="btn-auth-submit" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 size={18} className="auth-spinner" /> Đang xử lý...</>
                ) : (activeTab === 'login' ? 'Đăng nhập' : 'Đăng ký')}
              </button>
            </form>
          </div>

          <div className="auth-divider">
            <span>hoặc</span>
          </div>

          {/* Social Logins */}
          <div className="auth-social-btns">
            <button className="btn-social btn-google">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Google</span>
            </button>
            <button className="btn-social btn-facebook">
              <Facebook size={18} fill="#ffffff" color="#1877F2" className="facebook-icon" />
              <span>Facebook</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(content, document.body);
};

export default AuthModal;
