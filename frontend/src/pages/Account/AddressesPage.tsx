import { useEffect, useState } from 'react';
import './Account.css';
import { addressService } from '../../services/addressService';
import type { Address } from '../../types';
import { useToast } from '../../contexts/ToastContext';

const emptyForm: Omit<Address, 'id'> = {
  fullName: '',
  phone: '',
  street: '',
  ward: '',
  district: '',
  city: '',
  isDefault: false,
};

const AddressesPage = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<Omit<Address, 'id'>>(emptyForm);
  const { addToast } = useToast();

  useEffect(() => {
    setAddresses(addressService.getAll());
  }, []);

  const refresh = () => setAddresses(addressService.getAll());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.street || !form.city) {
      addToast('Vui lòng điền đủ thông tin', 'error');
      return;
    }
    addressService.add(form);
    addToast('Đã lưu địa chỉ', 'success');
    setForm(emptyForm);
    refresh();
  };

  const handleDelete = (id: string) => {
    addressService.remove(id);
    refresh();
    addToast('Đã xoá địa chỉ', 'info');
  };

  const handleSetDefault = (id: string) => {
    addressService.setDefault(id);
    refresh();
    addToast('Đã chọn địa chỉ mặc định', 'success');
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1 className="account-title">Sổ địa chỉ</h1>
        </div>
        <p className="account-subtitle">Quản lý địa chỉ giao hàng của bạn.</p>

        <div className="account-section">
          <h3>Thêm địa chỉ mới</h3>
          <form onSubmit={handleSubmit} className="account-form-grid">
            <div className="account-field">
              <label>Họ tên</label>
              <input className="account-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="account-field">
              <label>Số điện thoại</label>
              <input className="account-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="account-field">
              <label>Địa chỉ</label>
              <input className="account-input" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>
            <div className="account-field">
              <label>Phường/Xã</label>
              <input className="account-input" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
            </div>
            <div className="account-field">
              <label>Quận/Huyện</label>
              <input className="account-input" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            </div>
            <div className="account-field">
              <label>Tỉnh/Thành phố</label>
              <input className="account-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="account-field" style={{ alignSelf: 'end' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                Đặt làm mặc định
              </label>
            </div>
            <div className="account-field" style={{ alignSelf: 'end' }}>
              <button type="submit" className="btn-primary">Lưu địa chỉ</button>
            </div>
          </form>
        </div>

        <div className="account-section">
          <h3>Địa chỉ của bạn</h3>
          <div className="account-list">
            {addresses.map(addr => (
              <div className="account-card" key={addr.id}>
                <div>
                  <h4>
                    {addr.fullName} {addr.isDefault && <span className="badge-default">Mặc định</span>}
                  </h4>
                  <div className="account-meta">{addr.phone}</div>
                  <div className="account-meta">{addr.street}</div>
                  <div className="account-meta">{[addr.ward, addr.district, addr.city].filter(Boolean).join(', ')}</div>
                </div>
                <div className="account-actions">
                  {!addr.isDefault && (
                    <button className="btn-secondary" onClick={() => handleSetDefault(addr.id)}>Đặt mặc định</button>
                  )}
                  <button className="btn-link" onClick={() => handleDelete(addr.id)}>Xoá</button>
                </div>
              </div>
            ))}
            {addresses.length === 0 && <div className="account-meta">Chưa có địa chỉ nào.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressesPage;
