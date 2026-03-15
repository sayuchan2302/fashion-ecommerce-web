import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Check, CreditCard, Wallet, Banknote, Truck, Shield, RefreshCw, Award, Loader2 } from 'lucide-react';
import './Checkout.css';
import { useCart } from '../../contexts/CartContext';
import AddressBookModal from './AddressBookModal';

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'momo' | 'vnpay' | 'card'>('cod');
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formValues, setFormValues] = useState({
    name: '', phone: '', address: '', city: '', district: '', ward: ''
  });
  
  // Calculate Totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = shippingMethod === 'standard' ? 30000 : 50000;
  // Free shipping logic mock
  const finalShippingFee = subtotal > 500000 ? 0 : shippingFee; 
  const total = subtotal + finalShippingFee;

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const handleAddressSelect = (addr: any) => {
    setFormValues(prev => ({
      ...prev,
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      ward: addr.ward,
      district: addr.district,
      city: addr.city,
    }));
    // Clear errors for auto-filled fields
    setFormErrors({});
  };

  const validate = (): FormErrors => {
    const errors: FormErrors = {};
    if (!formValues.name.trim()) errors.name = 'Vui lòng nhập họ và tên';
    if (!formValues.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại';
    else if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(formValues.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ';
    if (!formValues.address.trim()) errors.address = 'Vui lòng nhập địa chỉ';
    if (!formValues.city) errors.city = 'Vui lòng chọn tỉnh / thành phố';
    if (!formValues.district) errors.district = 'Vui lòng chọn quận / huyện';
    if (!formValues.ward) errors.ward = 'Vui lòng chọn phường / xã';
    return errors;
  };

  const handleFieldChange = (field: keyof typeof formValues, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // Scroll to first error
      const firstErrorField = document.querySelector('.input-error');
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setIsLoading(false);
      clearCart(); // Clear cart after successful order
      setIsSuccessModalOpen(true);
    }, 1500);
  };

  const handleBackToHome = () => {
    setIsSuccessModalOpen(false);
    navigate('/');
  };

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };

  return (
    <div className="checkout-page-container">
      <div className="checkout-main-content">
        <div className="container checkout-layout">
          
          {/* Left Column: Form Setup */}
          <div className="checkout-left-col">
            <nav className="checkout-breadcrumbs">
              <Link to="/cart">Giỏ hàng</Link>
              <ChevronRight size={14} className="breadcrumb-separator" />
              <span className="current">Thông tin vận chuyển</span>
              <ChevronRight size={14} className="breadcrumb-separator text-muted" />
              <span className="text-muted">Phương thức thanh toán</span>
            </nav>

            <form id="checkout-form" onSubmit={handlePlaceOrder}>
              
              {/* Section: Contact & Shipping Info */}
              <section className="checkout-section">
                <div className="section-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 className="checkout-section-title" style={{ marginBottom: 0 }}>Thông tin giao hàng</h2>
                  <button 
                    type="button" 
                    className="address-book-toggle-btn"
                    onClick={() => setIsAddressModalOpen(true)}
                    style={{ color: 'var(--co-blue)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Award size={16} /> Chọn từ sổ địa chỉ
                  </button>
                </div>

                <div className="form-grid">
                  <div className="form-group col-span-2">
                    <input
                      type="text"
                      className={`checkout-input ${formErrors.name ? 'input-error' : ''}`}
                      placeholder="Họ và Tên *"
                      value={formValues.name}
                      onChange={e => handleFieldChange('name', e.target.value)}
                    />
                    {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                  </div>
                  <div className="form-group col-span-1">
                    <input
                      type="tel"
                      className={`checkout-input ${formErrors.phone ? 'input-error' : ''}`}
                      placeholder="Số điện thoại *"
                      value={formValues.phone}
                      onChange={e => handleFieldChange('phone', e.target.value)}
                    />
                    {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                  </div>
                  <div className="form-group col-span-1">
                    <input type="email" className="checkout-input" placeholder="Email (Không bắt buộc)" />
                  </div>
                  <div className="form-group col-span-2">
                    <input
                      type="text"
                      className={`checkout-input ${formErrors.address ? 'input-error' : ''}`}
                      placeholder="Địa chỉ chi tiết (Số nhà, đường...) *"
                      value={formValues.address}
                      onChange={e => handleFieldChange('address', e.target.value)}
                    />
                    {formErrors.address && <span className="field-error">{formErrors.address}</span>}
                  </div>
                  <div className="form-group col-span-1">
                    <select
                      className={`checkout-select ${formErrors.city ? 'input-error' : ''}`}
                      value={formValues.city}
                      onChange={e => handleFieldChange('city', e.target.value)}
                    >
                      <option value="" disabled>Chọn Tỉnh / Thành phố *</option>
                      <option value="hcm">Hồ Chí Minh</option>
                      <option value="hn">Hà Nội</option>
                      <option value="dn">Đà Nẵng</option>
                    </select>
                    {formErrors.city && <span className="field-error">{formErrors.city}</span>}
                  </div>
                  <div className="form-group col-span-1">
                    <select
                      className={`checkout-select ${formErrors.district ? 'input-error' : ''}`}
                      value={formValues.district}
                      onChange={e => handleFieldChange('district', e.target.value)}
                    >
                      <option value="" disabled>Chọn Quận / Huyện *</option>
                      <option value="q1">Quận 1</option>
                      <option value="q3">Quận 3</option>
                      <option value="bt">Bình Thạnh</option>
                    </select>
                    {formErrors.district && <span className="field-error">{formErrors.district}</span>}
                  </div>
                  <div className="form-group col-span-2">
                    <select
                      className={`checkout-select ${formErrors.ward ? 'input-error' : ''}`}
                      value={formValues.ward}
                      onChange={e => handleFieldChange('ward', e.target.value)}
                    >
                      <option value="" disabled>Chọn Phường / Xã *</option>
                      <option value="p1">Phường Bến Nghé</option>
                      <option value="p2">Phường Đa Kao</option>
                    </select>
                    {formErrors.ward && <span className="field-error">{formErrors.ward}</span>}
                  </div>
                  <div className="form-group col-span-2">
                    <textarea className="checkout-input textarea" placeholder="Ghi chú thêm (Không bắt buộc)" rows={3}></textarea>
                  </div>
                </div>
              </section>

              {/* Section: Shipping Methods */}
              <section className="checkout-section">
                <h2 className="checkout-section-title">Phương thức vận chuyển</h2>
                <div className="method-options-list">
                  <label className={`method-card ${shippingMethod === 'standard' ? 'selected' : ''}`}>
                    <div className="method-radio">
                      <input 
                        type="radio" 
                        name="shipping" 
                        value="standard" 
                        checked={shippingMethod === 'standard'}
                        onChange={() => setShippingMethod('standard')}
                      />
                      <span className="custom-radio"></span>
                    </div>
                    <div className="method-info">
                      <div className="method-name">
                        <Truck size={20} className="method-icon" /> Giao hàng tiêu chuẩn
                      </div>
                      <div className="method-desc">Dự kiến giao hàng trong 2-3 ngày làm việc</div>
                    </div>
                    <div className="method-price">
                       {subtotal > 500000 ? 'Miễn phí' : '30.000đ'}
                    </div>
                  </label>

                  <label className={`method-card ${shippingMethod === 'express' ? 'selected' : ''}`}>
                    <div className="method-radio">
                      <input 
                        type="radio" 
                        name="shipping" 
                        value="express" 
                        checked={shippingMethod === 'express'}
                        onChange={() => setShippingMethod('express')}
                      />
                      <span className="custom-radio"></span>
                    </div>
                    <div className="method-info">
                      <div className="method-name">
                        <Truck size={20} className="method-icon text-blue" /> Giao hàng nhanh (Hoả tốc)
                      </div>
                      <div className="method-desc">Dự kiến giao hàng trong 24h</div>
                    </div>
                    <div className="method-price">
                      {subtotal > 500000 ? '20.000đ' : '50.000đ'}
                    </div>
                  </label>
                </div>
              </section>


              {/* Mobile Order CTA (Hidden on desktop) */}
              <div className="mobile-checkout-cta">
                <div className="mobile-total">
                  <span>Tổng cộng:</span>
                  <span className="price">{formatPrice(total)}</span>
                </div>
                <button type="submit" className="btn-place-order" form="checkout-form" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 size={20} className="spinner" /> Đang xử lý...</>
                  ) : 'ĐẶT HÀNG NGAY'}
                </button>
              </div>

            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="checkout-right-col">
            <div className="checkout-summary-wrapper sticky">
              <h2 className="summary-title">Đơn hàng của bạn ({items.length} sản phẩm)</h2>
              
              <div className="checkout-items-scrollable">
                {items.map((item) => (
                  <div key={item.cartId} className="checkout-item">
                    <div className="item-img-wrapper">
                      <img src={item.image} alt={item.name} />
                      <span className="item-qty-badge">{item.quantity}</span>
                    </div>
                    <div className="item-info-wrapper">
                      <h4 className="item-title">{item.name}</h4>
                      <p className="item-variant">{item.color} / {item.size}</p>
                    </div>
                    <div className="item-price-wrapper">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="checkout-coupon-box">
                <input type="text" placeholder="Mã giảm giá" className="checkout-input" />
                <button className="btn-apply-coupon">Áp dụng</button>
              </div>

              {/* Section: Payment Methods (Moved to Right Column) */}
              <div className="checkout-payment-methods">
                <h3 className="summary-subtitle">Phương thức thanh toán</h3>
                <div className="method-options-list compact">
                  
                  <label className={`method-card ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                    <div className="method-radio">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="cod" 
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        form="checkout-form"
                      />
                      <span className="custom-radio"></span>
                    </div>
                    <div className="method-info">
                      <div className="method-name">
                        <Banknote size={18} className="method-icon" /> Thanh toán khi nhận hàng (COD)
                      </div>
                    </div>
                  </label>

                  <label className={`method-card ${paymentMethod === 'momo' ? 'selected' : ''}`}>
                    <div className="method-radio">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="momo" 
                        checked={paymentMethod === 'momo'}
                        onChange={() => setPaymentMethod('momo')}
                        form="checkout-form"
                      />
                      <span className="custom-radio"></span>
                    </div>
                    <div className="method-info">
                      <div className="method-name">
                        <Wallet size={18} className="method-icon text-pink" /> Ví điện tử MoMo
                      </div>
                    </div>
                  </label>

                  <label className={`method-card ${paymentMethod === 'vnpay' ? 'selected' : ''}`}>
                    <div className="method-radio">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="vnpay" 
                        checked={paymentMethod === 'vnpay'}
                        onChange={() => setPaymentMethod('vnpay')}
                        form="checkout-form"
                      />
                      <span className="custom-radio"></span>
                    </div>
                    <div className="method-info">
                      <div className="method-name">
                        <Wallet size={18} className="method-icon text-blue" /> VNPAY / TháiQR
                      </div>
                    </div>
                  </label>

                  <label className={`method-card ${paymentMethod === 'card' ? 'selected' : ''}`}>
                    <div className="method-radio">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="card" 
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                        form="checkout-form"
                      />
                      <span className="custom-radio"></span>
                    </div>
                    <div className="method-info">
                      <div className="method-name">
                        <CreditCard size={18} className="method-icon" /> Thẻ tín dụng
                      </div>
                    </div>
                  </label>

                </div>
              </div>

              <div className="checkout-totals">
                <div className="total-line">
                  <span>Tạm tính</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="total-line">
                  <span>Phí vận chuyển</span>
                  <span>{finalShippingFee === 0 ? 'Miễn phí' : formatPrice(finalShippingFee)}</span>
                </div>
                
                <div className="total-line final-total">
                  <span>Tổng cộng</span>
                  <div className="final-price-wrapper">
                    <span className="currency">VND</span>
                    <span className="price">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-place-order desktop-only" form="checkout-form" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 size={20} className="spinner" /> Đang xử lý...</>
                ) : 'ĐẶT HÀNG'}
              </button>

              {/* Trust Badges */}
              <div className="checkout-trust-badges">
                <div className="checkout-trust-item">
                  <Shield size={18} className="trust-icon" />
                  <div>
                    <div className="trust-title">Thanh toán bảo mật</div>
                    <div className="trust-desc">Mã hóa SSL 256-bit</div>
                  </div>
                </div>
                <div className="checkout-trust-item">
                  <RefreshCw size={18} className="trust-icon" />
                  <div>
                    <div className="trust-title">Đổi trả dễ dàng</div>
                    <div className="trust-desc">Hoàn tiền trong 60 ngày</div>
                  </div>
                </div>
                <div className="checkout-trust-item">
                  <Award size={18} className="trust-icon" />
                  <div>
                    <div className="trust-title">Chất lượng đảm bảo</div>
                    <div className="trust-desc">Sản phẩm chính hãng 100%</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Order Success Modal */}
      {isSuccessModalOpen && (
        <div className="success-modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon-circle">
              <Check size={40} className="text-white" />
            </div>
            <h2>Đặt Hàng Thành Công!</h2>
            <p className="success-message">
              Cảm ơn bạn đã mua sắm tại Coolmate.<br/>
              Mã đơn hàng của bạn là: <strong>#CMT-{Math.floor(100000 + Math.random() * 900000)}</strong>
            </p>
            <p className="success-submessage">Chúng tôi sẽ sớm liên hệ để xác nhận đơn hàng.</p>
            <button className="btn-back-home" onClick={handleBackToHome}>
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      )}

      <AddressBookModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelectAddress={handleAddressSelect}
      />
    </div>
  );
};

export default Checkout;
