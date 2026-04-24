import './Vendor.css';
import { useEffect, useRef, useState } from 'react';
import { Bell, CreditCard, MapPin, Save, ShieldCheck, Store, Truck, Upload } from 'lucide-react';
import VendorLayout from './VendorLayout';
import { PanelSectionHeader, PanelStatsGrid, PanelTabs } from '../../components/Panel/PanelPrimitives';
import { vendorPortalService, type VendorSettingsData } from '../../services/vendorPortalService';
import { storeService } from '../../services/storeService';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';
import { PLACEHOLDER_STORE_IMAGE } from '../../constants/placeholders';

type SettingsTab = 'store' | 'bank' | 'notifications' | 'shipping';

const DEFAULT_SETTINGS: VendorSettingsData = {
  storeInfo: { name: '', slug: '', description: '', logo: '', banner: '', contactEmail: '', phone: '', address: '' },
  bankInfo: { bankName: '', accountNumber: '', accountHolder: '', verified: false },
  notifications: { newOrder: true, orderStatusChange: true, lowStock: true, payoutComplete: true, promotions: false },
  shipping: { ghn: true, ghtk: true, express: false, warehouseAddress: '', warehouseContact: '', warehousePhone: '' },
};

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'store', label: 'Gian hàng' },
  { id: 'bank', label: 'Tài khoản nhận tiền' },
  { id: 'notifications', label: 'Thông báo' },
  { id: 'shipping', label: 'Vận chuyển' },
];

const STORE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const VendorSettings = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('store');
  const [settings, setSettings] = useState<VendorSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        setLoadError('');
        const next = await vendorPortalService.getSettings();
        if (!mounted) return;
        setSettings(next);
      } catch (err: unknown) {
        if (!mounted) return;
        const message = getUiErrorMessage(err, 'Không tải được cấu hình gian hàng');
        setLoadError(message);
        setSettings(null);
        addToast(message, 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [addToast, reloadKey]);

  const updateStoreField = (key: keyof VendorSettingsData['storeInfo']) => (value: string) =>
    setSettings((current) =>
      current ? { ...current, storeInfo: { ...current.storeInfo, [key]: value } } : current,
    );

  const updateBankField = (key: 'bankName' | 'accountNumber' | 'accountHolder') => (value: string) =>
    setSettings((current) =>
      current ? { ...current, bankInfo: { ...current.bankInfo, [key]: value } } : current,
    );

  const toggleNotification = (key: keyof VendorSettingsData['notifications']) =>
    setSettings((current) =>
      current
        ? { ...current, notifications: { ...current.notifications, [key]: !current.notifications[key] } }
        : current,
    );

  const toggleCarrier = (key: keyof VendorSettingsData['shipping']) =>
    setSettings((current) =>
      current ? { ...current, shipping: { ...current.shipping, [key]: !current.shipping[key] } } : current,
    );

  const summary = settings || DEFAULT_SETTINGS;
  const carrierCount = [summary.shipping.ghn, summary.shipping.ghtk, summary.shipping.express].filter(Boolean).length;
  const notificationsOn = Object.values(summary.notifications).filter(Boolean).length;

  const statItems = [
    {
      key: 'store',
      label: 'Hồ sơ gian hàng',
      value: summary.storeInfo.name || 'Chưa đặt tên',
      sub: 'Hiển thị trên trang sản phẩm',
    },
    {
      key: 'bank',
      label: 'Đối soát',
      value: summary.bankInfo.verified ? 'Đã xác minh' : 'Chưa xác minh',
      sub: summary.bankInfo.bankName || 'Ngân hàng chưa chọn',
      tone: summary.bankInfo.verified ? 'success' : 'warning',
    },
    {
      key: 'notifications',
      label: 'Thông báo',
      value: `${notificationsOn}/5 đang bật`,
      sub: 'Cảnh báo vận hành',
      tone: 'info',
    },
    {
      key: 'shipping',
      label: 'Đơn vị vận chuyển',
      value: carrierCount || 'Chưa bật',
      sub: summary.shipping.warehouseAddress ? 'Kho đã khai báo' : 'Chưa có địa chỉ kho',
      tone: carrierCount ? 'warning' : 'danger',
    },
  ] as const;

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await vendorPortalService.updateSettings(settings);
      setSettings(next);
      addToast('Đã lưu cấu hình vận hành', 'success');
    } catch (err: unknown) {
      addToast(getUiErrorMessage(err, 'Lưu cấu hình thất bại'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.toLowerCase().startsWith('image/')) {
      addToast('Chỉ chấp nhận file ảnh cho logo.', 'error');
      event.target.value = '';
      return;
    }

    if (file.size > STORE_IMAGE_MAX_BYTES) {
      addToast('Ảnh logo vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.', 'error');
      event.target.value = '';
      return;
    }

    setUploadingLogo(true);
    try {
      const imageUrl = await storeService.uploadStoreImage(file);
      updateStoreField('logo')(imageUrl);
      addToast('Đã tải logo gian hàng.', 'success');
    } catch (err: unknown) {
      addToast(getUiErrorMessage(err, 'Tải logo thất bại'), 'error');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  return (
    <VendorLayout
      title="Cài đặt vận hành & gian hàng"
      breadcrumbs={['Kênh Người Bán', 'Cài đặt vận hành']}
      actions={(
        <button className="admin-primary-btn vendor-admin-primary" onClick={handleSave} disabled={saving || !settings}>
          <Save size={16} />
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      )}
    >
      <div className="vendor-settings-shell">
        {loading ? (
          <AdminStateBlock
            type="empty"
            title="Đang tải cấu hình gian hàng"
            description="Thông tin gian hàng, đối soát và vận hành đang được đồng bộ."
          />
        ) : loadError || !settings ? (
          <AdminStateBlock
            type="error"
            title="Không tải được cấu hình gian hàng"
            description={loadError || 'Dữ liệu cấu hình không khả dụng.'}
            actionLabel="Thử lại"
            onAction={() => setReloadKey((key) => key + 1)}
          />
        ) : (
          <>
            <div className="vendor-settings-hero">
              <PanelStatsGrid items={[...statItems]} />
              <div className="vendor-settings-tabs">
                <PanelTabs
                  items={TABS.map((tab) => ({ key: tab.id, label: tab.label }))}
                  activeKey={activeTab}
                  onChange={(key) => setActiveTab(key as SettingsTab)}
                  accentClassName="vendor-active-tab"
                />
                <p className="vendor-settings-hint">Cập nhật 1 lần, áp dụng cho toàn bộ gian hàng và đơn vận hành.</p>
              </div>
            </div>

            <section className="admin-panels single vendor-settings-panels">
            {activeTab === 'store' && (
              <div className="admin-panel vendor-settings-panel">
                <PanelSectionHeader
                  title={<><Store size={16} /> Hồ sơ gian hàng công khai</>}
                  description="Tên, mô tả và thông tin liên hệ hiển thị trên storefront và các điểm \u201cBán bởi\u201d."
                />
                <div className="form-grid">
                  <label className="form-field">
                    <span>Tên gian hàng</span>
                    <input
                      value={settings.storeInfo.name}
                      onChange={(e) => updateStoreField('name')(e.target.value)}
                      placeholder="Ví dụ: Coolmate Official"
                    />
                  </label>
                  <label className="form-field">
                    <span>Số điện thoại liên hệ</span>
                    <input
                      value={settings.storeInfo.phone}
                      onChange={(e) => updateStoreField('phone')(e.target.value)}
                      placeholder="09xx xxx xxx"
                    />
                  </label>
                  <label className="form-field">
                    <span>Email hỗ trợ</span>
                    <input
                      value={settings.storeInfo.contactEmail}
                      onChange={(e) => updateStoreField('contactEmail')(e.target.value)}
                      placeholder="support@shop.vn"
                    />
                  </label>
                  <label className="form-field">
                    <span>Logo gian hàng</span>
                    <div className="storefront-upload-actions">
                      <button
                        type="button"
                        className="admin-ghost-btn small storefront-upload-btn"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        <Upload size={14} />
                        <span>{uploadingLogo ? 'Đang tải logo...' : 'Tải logo từ máy'}</span>
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(event) => void handleUploadLogo(event)}
                        style={{ display: 'none' }}
                      />
                    </div>
                    <div className="storefront-upload-preview is-logo">
                      <img src={settings.storeInfo.logo || PLACEHOLDER_STORE_IMAGE} alt="Logo gian hàng" />
                    </div>
                  </label>
                  <label className="form-field full">
                    <span>Địa chỉ hiển thị công khai</span>
                    <input
                      value={settings.storeInfo.address}
                      onChange={(e) => updateStoreField('address')(e.target.value)}
                      placeholder="Số nhà, phường, quận, tỉnh/thành"
                    />
                  </label>
                  <label className="form-field full">
                    <span>Mô tả gian hàng</span>
                    <textarea
                      rows={5}
                      value={settings.storeInfo.description}
                      onChange={(e) => updateStoreField('description')(e.target.value)}
                      placeholder="Giới thiệu ngắn gọn về thương hiệu, phân khúc, cam kết dịch vụ..."
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="admin-panel vendor-settings-panel">
                <PanelSectionHeader
                  title={<><CreditCard size={16} /> Tài khoản nhận tiền</>}
                  description="Thông tin dùng cho payout sau khi trừ phí sàn và đối soát đơn hàng."
                />
                <div className="form-grid">
                  <label className="form-field">
                    <span>Ngân hàng</span>
                    <input
                      value={settings.bankInfo.bankName}
                      onChange={(e) => updateBankField('bankName')(e.target.value)}
                      placeholder="Ví dụ: Vietcombank"
                    />
                  </label>
                  <label className="form-field">
                    <span>Số tài khoản</span>
                    <input
                      value={settings.bankInfo.accountNumber}
                      onChange={(e) => updateBankField('accountNumber')(e.target.value)}
                      placeholder="Nhập số tài khoản"
                    />
                  </label>
                  <label className="form-field">
                    <span>Chủ tài khoản</span>
                    <input
                      value={settings.bankInfo.accountHolder}
                      onChange={(e) => updateBankField('accountHolder')(e.target.value)}
                      placeholder="Họ và tên"
                    />
                  </label>
                  <div className="admin-card-row vendor-card-toggle">
                    <div>
                      <div className="admin-bold">Trạng thái xác minh</div>
                      <div className="admin-muted">Bật khi tài khoản đã khớp CCCD/giấy phép kinh doanh</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.bankInfo.verified}
                        disabled
                        readOnly
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                  <div className="admin-inline-hint">
                    <ShieldCheck size={14} /> Thông tin này dùng để chuyển payout; vui lòng đảm bảo khớp pháp lý.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="admin-panel vendor-settings-panel">
                <PanelSectionHeader
                  title={<><Bell size={16} /> Thông báo vận hành</>}
                  description="Chọn tín hiệu mà shop muốn được cảnh báo."
                />
                <div className="admin-card-list">
                  {[
                    ['newOrder', 'Đơn hàng mới', 'Báo khi shop phát sinh đơn cần tiếp nhận'],
                    ['orderStatusChange', 'Thay đổi trạng thái', 'Báo khi trạng thái vận hành thay đổi'],
                    ['lowStock', 'Cảnh báo tồn kho', 'Báo khi SKU sắp hết hàng'],
                    ['payoutComplete', 'Đối soát hoàn tất', 'Báo khi hệ thống chuyển payout'],
                    ['promotions', 'Khuyến mãi & chiến dịch', 'Nhận cập nhật các đợt sale từ sàn'],
                  ].map(([key, label, description]) => (
                    <div className="admin-card-row vendor-card-toggle" key={key}>
                      <div>
                        <div className="admin-bold">{label}</div>
                        <div className="admin-muted">{description}</div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.notifications[key as keyof VendorSettingsData['notifications']]}
                          onChange={() => toggleNotification(key as keyof VendorSettingsData['notifications'])}
                        />
                        <span className="switch-slider" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="admin-panel vendor-settings-panel">
                <PanelSectionHeader
                  title={<><Truck size={16} /> Vận chuyển & kho lấy hàng</>}
                  description="Chọn hãng giao nhận sẵn sàng và khai báo địa chỉ kho để đối soát phí giao hàng."
                />
                <div className="admin-card-list">
                  {[
                    ['ghn', 'Giao Hàng Nhanh (GHN)'],
                    ['ghtk', 'Giao Hàng Tiết Kiệm (GHTK)'],
                    ['express', 'Hỏa tốc nội thành'],
                  ].map(([key, label]) => (
                    <div className="admin-card-row vendor-card-toggle" key={key}>
                      <div>
                        <div className="admin-bold">{label}</div>
                        <div className="admin-muted">Bật khi shop cho phép hãng này lấy hàng</div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.shipping[key as keyof VendorSettingsData['shipping']] as boolean}
                          onChange={() => toggleCarrier(key as keyof VendorSettingsData['shipping'])}
                        />
                        <span className="switch-slider" />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="form-grid" style={{ marginTop: 12 }}>
                  <label className="form-field full">
                    <span><MapPin size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Địa chỉ kho</span>
                    <input
                      value={settings.shipping.warehouseAddress}
                      onChange={(e) => setSettings((current) =>
                        current ? { ...current, shipping: { ...current.shipping, warehouseAddress: e.target.value } } : current)}
                      placeholder="Số nhà, phường, quận, tỉnh/thành"
                    />
                  </label>
                  <label className="form-field">
                    <span>Người phụ trách kho</span>
                    <input
                      value={settings.shipping.warehouseContact}
                      onChange={(e) => setSettings((current) =>
                        current ? { ...current, shipping: { ...current.shipping, warehouseContact: e.target.value } } : current)}
                      placeholder="Họ và tên"
                    />
                  </label>
                  <label className="form-field">
                    <span>Điện thoại kho</span>
                    <input
                      value={settings.shipping.warehousePhone}
                      onChange={(e) => setSettings((current) =>
                        current ? { ...current, shipping: { ...current.shipping, warehousePhone: e.target.value } } : current)}
                      placeholder="09xx xxx xxx"
                    />
                  </label>
                </div>
              </div>
            )}
            </section>
          </>
        )}
      </div>
    </VendorLayout>
  );
};

export default VendorSettings;
