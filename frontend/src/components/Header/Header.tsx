import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart } from 'lucide-react';
import AuthModal from '../AuthModal/AuthModal';
import { useCartAnimation } from '../../context/CartAnimationContext';
import { useCart } from '../../contexts/CartContext';
import './Header.css';

const Header = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { cartIconRef } = useCartAnimation();

  // Pulse animation state
  const [isBouncing, setIsBouncing] = useState(false);
  const prevItemsRef = React.useRef(totalItems);

  React.useEffect(() => {
    if (totalItems > prevItemsRef.current) {
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 300);
    }
    prevItemsRef.current = totalItems;
  }, [totalItems]);

  const openAuthModal = (tab: 'login' | 'register') => {
    setAuthTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <header className="header">
      <div className="header-container container">
        {/* Logo */}
        <div className="header-logo">
          <Link to="/">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-icon">
              <path fillRule="evenodd" clipRule="evenodd" d="M16 0H24V16H40V24H24V40H16V24H0V16H16V0Z" fill="black" />
            </svg>
            <span className="logo-text">
              COOL<span className="logo-mate">MATE</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="header-nav">
          <ul className="nav-list">
            <li><Link to="/category/new" className="nav-link nav-new">NEW</Link></li>
            <li className="nav-item has-mega-menu">
              <Link to="/category/men" className="nav-link">NAM</Link>
              <div className="mega-menu">
                <div className="mega-menu-content">
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">ÁO</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Áo thun</a></li>
                      <li><a href="#">Áo polo</a></li>
                      <li><a href="#">Áo sơ mi</a></li>
                      <li><a href="#">Áo hoodie</a></li>
                      <li><a href="#">Áo len</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">QUẦN</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Quần jeans</a></li>
                      <li><a href="#">Quần tây</a></li>
                      <li><a href="#">Quần kaki</a></li>
                      <li><a href="#">Quần short</a></li>
                      <li><a href="#">Quần jogger</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">ĐỒ THỂ THAO</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Áo thể thao</a></li>
                      <li><a href="#">Quần thể thao</a></li>
                      <li><a href="#">Set thể thao</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">ĐỒ MẶC NHÀ</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Áo mặc nhà</a></li>
                      <li><a href="#">Quần mặc nhà</a></li>
                      <li><a href="#">Bộ mặc nhà</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">PHỤ KIỆN</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Nón / mũ</a></li>
                      <li><a href="#">Thắt lưng</a></li>
                      <li><a href="#">Ví</a></li>
                      <li><a href="#">Tất</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </li>

            <li className="nav-item has-mega-menu">
              <Link to="/category/women" className="nav-link">NỮ</Link>
              <div className="mega-menu">
                <div className="mega-menu-content">
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">ÁO</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Áo thun</a></li>
                      <li><a href="#">Áo kiểu</a></li>
                      <li><a href="#">Áo sơ mi</a></li>
                      <li><a href="#">Áo croptop</a></li>
                      <li><a href="#">Áo khoác</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">VÁY / ĐẦM</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Váy liền</a></li>
                      <li><a href="#">Váy dự tiệc</a></li>
                      <li><a href="#">Váy công sở</a></li>
                      <li><a href="#">Váy maxi</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">QUẦN</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Quần jeans</a></li>
                      <li><a href="#">Quần short</a></li>
                      <li><a href="#">Quần tây</a></li>
                      <li><a href="#">Quần legging</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">ĐỒ THỂ THAO</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Áo thể thao</a></li>
                      <li><a href="#">Quần thể thao</a></li>
                      <li><a href="#">Set thể thao</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">ĐỒ MẶC NHÀ</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Áo mặc nhà</a></li>
                      <li><a href="#">Quần mặc nhà</a></li>
                      <li><a href="#">Bộ mặc nhà</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">PHỤ KIỆN</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Túi xách</a></li>
                      <li><a href="#">Nón / mũ</a></li>
                      <li><a href="#">Khăn</a></li>
                      <li><a href="#">Thắt lưng</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </li>
            <li className="nav-item has-mega-menu">
              <Link to="/category/accessories" className="nav-link">PHỤ KIỆN</Link>
              <div className="mega-menu">
                <div className="mega-menu-content">
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">Túi & ví</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Túi xách</a></li>
                      <li><a href="#">Túi đeo chéo</a></li>
                      <li><a href="#">Balo</a></li>
                      <li><a href="#">Ví</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">Phụ kiện thời trang</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Nón / mũ</a></li>
                      <li><a href="#">Thắt lưng</a></li>
                      <li><a href="#">Khăn</a></li>
                      <li><a href="#">Tất</a></li>
                    </ul>
                  </div>
                  <div className="mega-menu-col">
                    <h3 className="mega-menu-title">Phụ kiện khác (tuỳ shop)</h3>
                    <ul className="mega-menu-list">
                      <li><a href="#">Kính mát</a></li>
                      <li><a href="#">Đồng hồ</a></li>
                      <li><a href="#">Trang sức</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </li>
            <li>
              <Link to="/category/sale" className="nav-link nav-sale">
                <span className="sale-badge">-50%</span> SALE
              </Link>
            </li>
          </ul>
        </nav>

        {/* Actions */}
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Tìm kiếm sản phẩm..." className="search-input" />
          </div>
          <div className="auth-links">
            <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); openAuthModal('login'); }}>Đăng nhập</a>
            <span className="auth-divider">/</span>
            <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); openAuthModal('register'); }}>Đăng ký</a>
          </div>
          <button 
            ref={cartIconRef}
            className={`icon-btn cart-btn ${isBouncing ? 'cart-bounce' : ''}`} 
            aria-label="Giỏ hàng" 
            onClick={() => navigate('/cart')}
          >
            <ShoppingCart size={22} />
            {totalItems > 0 && <span className="cart-badge">{totalItems > 99 ? '99+' : totalItems}</span>}
          </button>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialTab={authTab} 
      />
    </header>
  );
};

export default Header;
