import './Vendor.css';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, ImagePlus, Save, ShieldCheck, Tag } from 'lucide-react';
import VendorLayout from './VendorLayout';
import { vendorPortalService, type VendorSettingsData } from '../../services/vendorPortalService';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';

const defaultSettings: VendorSettingsData = {
  storeInfo: { name: '', slug: '', description: '', logo: '', contactEmail: '', phone: '', address: '' },
  bankInfo: { bankName: '', accountNumber: '', accountHolder: '', verified: false },
  notifications: { newOrder: true, orderStatusChange: true, lowStock: true, payoutComplete: true, promotions: false },
  shipping: { ghn: true, ghtk: true, express: false, warehouseAddress: '', warehouseContact: '', warehousePhone: '' },
};

const VendorStorefront = () => {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<VendorSettingsData>(defaultSettings);
  const [bannerUrl, setBannerUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        setLoadError('');
        const next = await vendorPortalService.getSettings();
        if (!active) return;
        setSettings(next);
      } catch (err: unknown) {
        if (!active) return;
        const message = getUiErrorMessage(err, 'Không tải được gian hàng công khai');
        setLoadError(message);
        addToast(message, 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [addToast, reloadKey]);

  const completion = useMemo(() => {
    const fields = [
      settings.storeInfo.name,
      settings.storeInfo.description,
      settings.storeInfo.logo,
      settings.storeInfo.contactEmail,
      settings.storeInfo.phone,
      settings.storeInfo.address,
      bannerUrl,
      tagline,
    ];
    const filled = fields.filter((field) => field.trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [bannerUrl, settings, tagline]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await vendorPortalService.updateSettings(settings);
      addToast('Đã lưu bộ mặt gian hàng', 'success');
    } catch (err: unknown) {
      addToast(getUiErrorMessage(err, 'Lưu gian hàng thất bại'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <VendorLayout
      title="Gian hàng công khai và bộ mặt thương hiệu"
      breadcrumbs={['Kênh Người Bán', 'Gian hàng']}
      actions={(
        <>
          {settings.storeInfo.slug ? (
            <a className="admin-ghost-btn" href={`/store/${settings.storeInfo.slug}`}>
              <ExternalLink size={16} />
              Xem trang công khai
            </a>
          ) : (
            <button type="button" className="admin-ghost-btn" disabled title="Chưa có slug storefront">
              <ExternalLink size={16} />
              Chưa có đường dẫn công khai
            </button>
          )}
          <button className="admin-primary-btn vendor-admin-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? 'Đang lưu...' : 'Lưu gian hàng'}
          </button>
        </>
      )}
    >
      {loading ? (
        <AdminStateBlock
          type="empty"
          title="Đang tải gian hàng công khai"
          description="Hồ sơ storefront của shop đang được đồng bộ."
        />
      ) : loadError ? (
        <AdminStateBlock
          type="error"
          title="Không tải được gian hàng công khai"
          description={loadError}
          actionLabel="Thử lại"
          onAction={() => setReloadKey((key) => key + 1)}
        />
      ) : (
        <>
          <div className="admin-stats grid-4">
            <div className="admin-stat-card">
              <div className="admin-stat-label">Mức hoàn thiện</div>
              <div className="admin-stat-value">{completion}%</div>
              <div className="admin-stat-sub">Độ đầy đủ của storefront hiện tại</div>
            </div>
            <div className="admin-stat-card success">
              <div className="admin-stat-label">Huy hiệu</div>
              <div className="admin-stat-value">Official</div>
              <div className="admin-stat-sub">Hiển thị khi shop đã được duyệt</div>
            </div>
            <div className="admin-stat-card info">
              <div className="admin-stat-label">Điểm chạm</div>
              <div className="admin-stat-value">/store/:slug</div>
              <div className="admin-stat-sub">Trang shop công khai trên marketplace</div>
            </div>
            <div className="admin-stat-card warning">
              <div className="admin-stat-label">Trạng thái</div>
              <div className="admin-stat-value">Sẵn sàng</div>
              <div className="admin-stat-sub">Có thể cập nhật và lưu ngay</div>
            </div>
          </div>

          <div className="admin-panels storefront-grid">
            <div className="admin-left">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Thiết lập thương hiệu</h2>
                  <span className="admin-muted">Các thông tin này xuất hiện trên storefront và điểm "Bán bởi".</span>
                </div>
                <div className="form-grid">
                  <label className="form-field full">
                    <span>Đường dẫn banner</span>
                    <input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Tên gian hàng</span>
                    <input value={settings.storeInfo.name} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, name: e.target.value } }))} />
                  </label>
                  <label className="form-field">
                    <span>Đường dẫn logo</span>
                    <input value={settings.storeInfo.logo} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, logo: e.target.value } }))} />
                  </label>
                  <label className="form-field full">
                    <span>Khẩu hiệu ngắn</span>
                    <input value={tagline} onChange={(e) => setTagline(e.target.value)} />
                  </label>
                  <label className="form-field full">
                    <span>Mô tả gian hàng</span>
                    <textarea rows={5} value={settings.storeInfo.description} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, description: e.target.value } }))} />
                  </label>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Thông tin công khai</h2>
                  <span className="admin-muted">Dữ liệu này khách hàng sẽ thấy khi ghé trang shop của bạn.</span>
                </div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Email liên hệ</span>
                    <input value={settings.storeInfo.contactEmail} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, contactEmail: e.target.value } }))} />
                  </label>
                  <label className="form-field">
                    <span>Số điện thoại</span>
                    <input value={settings.storeInfo.phone} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, phone: e.target.value } }))} />
                  </label>
                  <label className="form-field full">
                    <span>Địa chỉ hiển thị công khai</span>
                    <input value={settings.storeInfo.address} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, address: e.target.value } }))} />
                  </label>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Tín hiệu tin cậy</h2>
                </div>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold"><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> Huy hiệu chính hãng</span>
                    <span className="admin-muted">Chỉ hiển thị khi store được admin duyệt và đang hoạt động.</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold"><Tag size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> Gắn nhãn người bán</span>
                    <span className="admin-muted">Tên shop sẽ xuất hiện tại thẻ sản phẩm, trang chi tiết và phần tách đơn.</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="admin-right">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Xem trước storefront</h2>
                  <span className="admin-muted">Mô phỏng giao diện trang shop công khai</span>
                </div>
                <div className="vendor-store-preview">
                  <div className="vendor-store-preview-banner" style={{ backgroundImage: `linear-gradient(rgba(15,23,42,.22), rgba(15,23,42,.38)), url(${bannerUrl})` }} />
                  <div className="vendor-store-preview-body">
                    <div className="vendor-store-preview-head">
                      <div className="vendor-store-preview-logo">
                        {settings.storeInfo.logo ? (
                          <img src={settings.storeInfo.logo} alt={settings.storeInfo.name} />
                        ) : (
                          <div className="vendor-store-preview-logo-empty">
                            <ImagePlus size={26} />
                          </div>
                        )}
                      </div>
                      <div className="vendor-store-preview-copy">
                        <div className="vendor-store-preview-title">
                          <h3>{settings.storeInfo.name || 'Chưa cập nhật tên gian hàng'}</h3>
                          <span className="admin-pill teal"><ShieldCheck size={13} /> Chính hãng</span>
                        </div>
                        <p>{tagline || 'Chưa cập nhật khẩu hiệu gian hàng.'}</p>
                      </div>
                    </div>
                    <p className="vendor-store-preview-description">
                      {settings.storeInfo.description || 'Chưa cập nhật mô tả gian hàng.'}
                    </p>
                    <div className="vendor-store-preview-meta">
                      <span>{settings.storeInfo.contactEmail || 'Chưa cập nhật email liên hệ'}</span>
                      <span>{settings.storeInfo.phone || 'Chưa cập nhật số điện thoại'}</span>
                      <span>{settings.storeInfo.address || 'Chưa cập nhật địa chỉ gian hàng'}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Checklist storefront</h2>
                </div>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Logo và banner</span>
                    <span className="admin-muted">{settings.storeInfo.logo && bannerUrl ? 'Đã sẵn sàng' : 'Cần bổ sung hình ảnh thương hiệu'}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Thông tin liên hệ</span>
                    <span className="admin-muted">{settings.storeInfo.contactEmail && settings.storeInfo.phone ? 'Đã hoàn thiện' : 'Thiếu email hoặc số điện thoại'}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Mô tả thương hiệu</span>
                    <span className="admin-muted">{settings.storeInfo.description ? 'Đã có mô tả shop' : 'Nên thêm mô tả để tăng độ tin cậy'}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </VendorLayout>
  );
};

export default VendorStorefront;
