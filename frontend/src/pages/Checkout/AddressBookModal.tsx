import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import './AddressBookModal.css';

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  city: string;
  isDefault?: boolean;
}

// Temporary mock data for saved addresses
const MOCK_SAVED_ADDRESSES: SavedAddress[] = [
  {
    id: '1',
    name: 'Ngọc Thịnh Nguyễn',
    phone: '0382253049',
    address: 'Q7F, Quốc lộ 37',
    ward: 'Thị trấn Hùng Sơn',
    district: 'Huyện Đại Từ',
    city: 'Thái Nguyên',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Thịnh Nguyễn',
    phone: '0987654321',
    address: 'Số 15, Đường Lê Lợi',
    ward: 'Phường Bến Nghé',
    district: 'Quận 1',
    city: 'Hồ Chí Minh',
    isDefault: false,
  }
];

interface AddressBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: SavedAddress) => void;
}

const AddressBookModal = ({ isOpen, onClose, onSelectAddress }: AddressBookModalProps) => {
  const [addresses] = useState<SavedAddress[]>(MOCK_SAVED_ADDRESSES);
  const [selectedId, setSelectedId] = useState<string | null>(
    addresses.find(a => a.isDefault)?.id || null
  );

  if (!isOpen) return null;

  const handleSelect = () => {
    const selected = addresses.find(a => a.id === selectedId);
    if (selected) {
      onSelectAddress(selected);
      onClose();
    }
  };

  return (
    <div className="address-modal-overlay">
      <div className="address-modal-container">
        <div className="address-modal-header">
          <h2>Chọn từ sổ địa chỉ</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="address-modal-body">
          {addresses.length === 0 ? (
            <div className="empty-address-msg">Bạn chưa có địa chỉ nào trong sổ.</div>
          ) : (
            <div className="address-list">
              {addresses.map(addr => (
                <div 
                  key={addr.id} 
                  className={`address-item ${selectedId === addr.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(addr.id)}
                >
                  <div className="address-item-header">
                    <span className="address-name">{addr.name}</span>
                    {addr.isDefault && <span className="address-badge">Mặc định</span>}
                  </div>
                  <div className="address-phone">{addr.phone}</div>
                  <div className="address-full">
                    {addr.address}, {addr.ward}, {addr.district}, {addr.city}
                  </div>
                  {selectedId === addr.id && (
                    <div className="address-check-icon">
                      <CheckCircle2 fill="var(--co-blue)" color="white" size={24} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="address-modal-footer">
          <button 
            className="address-confirm-btn" 
            onClick={handleSelect}
            disabled={!selectedId}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressBookModal;
