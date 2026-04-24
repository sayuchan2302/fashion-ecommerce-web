import './Vendor.css';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Save, ShieldCheck, Upload } from 'lucide-react';
import VendorLayout from './VendorLayout';
import { vendorPortalService, type VendorSettingsData } from '../../services/vendorPortalService';
import { storeService, type StoreProfile } from '../../services/storeService';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';
import { PLACEHOLDER_STORE_BANNER } from '../../constants/placeholders';

const STORE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const defaultSettings: VendorSettingsData = {
  storeInfo: { name: '', slug: '', description: '', logo: '', banner: '', contactEmail: '', phone: '', address: '' },
  bankInfo: { bankName: '', accountNumber: '', accountHolder: '', verified: false },
  notifications: { newOrder: true, orderStatusChange: true, lowStock: true, payoutComplete: true, promotions: false },
  shipping: { ghn: true, ghtk: true, express: false, warehouseAddress: '', warehouseContact: '', warehousePhone: '' },
};

const resolveStorefrontStatus = (store: StoreProfile | null) => {
  if (!store) {
    return { label: 'Không xác định', detail: 'Không lấy được trạng thái gian hàng công khai.' };
  }

  if (store.approvalStatus !== 'APPROVED') {
    return { label: 'Chờ duyệt', detail: 'Store sẽ hiển thị công khai sau khi được admin phê duyệt.' };
  }

  if (store.status === 'ACTIVE') {
    return { label: 'Đang hoạt động', detail: 'Gian hàng công khai đang hiển thị cho người mua.' };
  }

  if (store.status === 'SUSPENDED') {
    return { label: 'Tạm khóa', detail: 'Gian hàng công khai tạm ẩn do vi phạm hồi kiểm duyệt.' };
  }

  return { label: 'Tạm offline', detail: 'Gian hàng công khai đang ở trạng thái không hoạt động.' };
};

const resolveApprovalStatus = (store: StoreProfile | null) => {
  if (!store) {
    return {
      label: 'Không xác định',
      detail: 'Chưa lấy được thông tin phê duyệt của gian hàng công khai.',
      tone: 'neutral' as const,
    };
  }

  if (store.approvalStatus === 'APPROVED') {
    return {
      label: 'Đã duyệt',
      detail: 'Store đã được admin duyệt.',
      tone: 'success' as const,
    };
  }

  if (store.approvalStatus === 'REJECTED') {
    return {
      label: 'Từ chối',
      detail: store.rejectionReason
        ? `Store bị từ chối: ${store.rejectionReason}`
        : 'Store bị từ chối và cần cập nhật hồ sơ trước khi gửi lại.',
      tone: 'error' as const,
    };
  }

  return {
    label: 'Chờ duyệt',
    detail: 'Store đang chờ admin phê duyệt để được hiển thị công khai.',
    tone: 'warning' as const,
  };
};

const resolveOperationalStatus = (store: StoreProfile | null) => {
  if (!store) {
    return {
      label: 'Không xác định',
      detail: 'Chưa lấy được trạng thái vận hành của gian hàng công khai.',
      tone: 'neutral' as const,
    };
  }

  if (store.status === 'ACTIVE') {
    return {
      label: 'Đang hoạt động',
      detail: 'Store đang vận hành bình thường.',
      tone: 'success' as const,
    };
  }

  if (store.status === 'SUSPENDED') {
    return {
      label: 'Tạm khóa',
      detail: 'Store đang bị tạm khóa bởi quản trị viên.',
      tone: 'error' as const,
    };
  }

  return {
    label: 'Tạm offline',
    detail: 'Store đang tạm offline và chưa hiển thị công khai.',
    tone: 'warning' as const,
  };
};

const VendorStorefront = () => {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<VendorSettingsData>(defaultSettings);
  const [storeMeta, setStoreMeta] = useState<StoreProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'banner' | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        setLoadError('');
        const [nextSettings, nextStore] = await Promise.all([
          vendorPortalService.getSettings(),
          storeService.getMyStore(),
        ]);
        if (!active) return;
        setSettings(nextSettings);
        setStoreMeta(nextStore);
      } catch (err: unknown) {
        if (!active) return;
        const message = getUiErrorMessage(err, 'Không tải được gian hàng công khai');
        setLoadError(message);
        addToast(message, 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [addToast, reloadKey]);

  const completion = useMemo(() => {
    const fields = [
      settings.storeInfo.name,
      settings.storeInfo.description,
      settings.storeInfo.logo,
      settings.storeInfo.banner,
      settings.storeInfo.contactEmail,
      settings.storeInfo.phone,
      settings.storeInfo.address,
    ];
    const filled = fields.filter((field) => field.trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const nextSettings = await vendorPortalService.updateSettings(settings);
      const nextStore = await storeService.getMyStore();
      setSettings(nextSettings);
      setStoreMeta(nextStore);
      addToast('Đã lưu bộ mặt gian hàng', 'success');
    } catch (err: unknown) {
      addToast(getUiErrorMessage(err, 'Lưu gian hàng thất bại'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openImagePicker = (field: 'logo' | 'banner') => {
    if (uploadingAsset) {
      return;
    }
    if (field === 'logo') {
      logoInputRef.current?.click();
      return;
    }
    bannerInputRef.current?.click();
  };

  const handleImageSelected = async (field: 'logo' | 'banner', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (file.size > STORE_IMAGE_MAX_BYTES) {
      addToast('Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.', 'error');
      return;
    }

    try {
      setUploadingAsset(field);
      const imageUrl = await storeService.uploadStoreImage(file);
      setSettings((current) => ({
        ...current,
        storeInfo: {
          ...current.storeInfo,
          [field]: imageUrl,
        },
      }));
      addToast(field === 'logo' ? 'Đã tải logo gian hàng.' : 'Đã tải banner gian hàng.', 'success');
    } catch (err: unknown) {
      addToast(getUiErrorMessage(err, 'Không thể tải ảnh gian hàng lên'), 'error');
    } finally {
      setUploadingAsset(null);
    }
  };

  const storefrontStatus = resolveStorefrontStatus(storeMeta);
  resolveApprovalStatus(storeMeta);
  resolveOperationalStatus(storeMeta);
  const storefrontPath = settings.storeInfo.slug ? `/store/${settings.storeInfo.slug}` : '/store/:slug';

  const storefrontChecklist = useMemo(() => {
    const hasValue = (value: string) => value.trim().length > 0;
    const hasBrandIdentity = hasValue(settings.storeInfo.name) && hasValue(settings.storeInfo.description);
    const hasVisualAssets = hasValue(settings.storeInfo.logo) && hasValue(settings.storeInfo.banner);
    const hasContactInfo =
      hasValue(settings.storeInfo.contactEmail) &&
      hasValue(settings.storeInfo.phone) &&
      hasValue(settings.storeInfo.address);
    const hasSlug = hasValue(settings.storeInfo.slug);
    const isApproved = storeMeta?.approvalStatus === 'APPROVED';
    const isActive = storeMeta?.status === 'ACTIVE';

    return [
      {
        key: 'identity',
        label: 'Tên và mô tả gian hàng',
        ok: hasBrandIdentity,
        hint: hasBrandIdentity
          ? 'Đã có thông tin nhận diện thương hiệu cơ bản.'
          : 'Thiếu tên hoặc mô tả, khách hàng sẽ khó nhận diện gian hàng.',
      },
      {
        key: 'assets',
        label: 'Logo và banner',
        ok: hasVisualAssets,
        hint: hasVisualAssets
          ? 'Đã có đủ hình ảnh để hiển thị trên gian hàng công khai.'
          : 'Cần bổ sung logo hoặc banner để gian hàng công khai hiển thị đầy đủ.',
      },
      {
        key: 'contact',
        label: 'Thông tin liên hệ công khai',
        ok: hasContactInfo,
        hint: hasContactInfo
          ? 'Email, số điện thoại và địa chỉ đã đầy đủ.'
          : 'Thiếu email, số điện thoại hoặc địa chỉ công khai.',
      },
      {
        key: 'slug',
        label: 'Đường dẫn gian hàng',
        ok: hasSlug,
        hint: hasSlug ? `Gian hàng đang dùng đường dẫn ${storefrontPath}.` : 'Chưa có slug để tạo đường dẫn gian hàng.',
      },
      {
        key: 'approval',
        label: 'Phê duyệt từ admin',
        ok: isApproved,
        hint: isApproved
          ? 'Store đã được admin phê duyệt.'
          : storeMeta?.approvalStatus === 'REJECTED'
            ? storeMeta.rejectionReason
              ? `Store bị từ chối: ${storeMeta.rejectionReason}`
              : 'Store bị từ chối và cần cập nhật hồ sơ.'
            : 'Store đang chờ admin phê duyệt.',
      },
      {
        key: 'active',
        label: 'Trạng thái vận hành',
        ok: isActive,
        hint: isActive
          ? 'Store đang hoạt động, khách mua có thể truy cập gian hàng.'
          : storeMeta?.status === 'SUSPENDED'
            ? 'Store đang tạm khóa và tạm thời không hiển thị.'
            : 'Store chưa ở trạng thái hoạt động nên chưa công khai trên marketplace.',
      },
    ];
  }, [settings, storeMeta, storefrontPath]);

  const passedChecks = storefrontChecklist.filter((item) => item.ok).length;
  const isStorefrontReady = passedChecks === storefrontChecklist.length;

  return (
    <VendorLayout
      title="Gian hàng công khai và bộ mặt thương hiệu"
      breadcrumbs={['Kênh Người Bán', 'Gian hàng']}
      actions={(
        <button className="vendor-primary-btn" onClick={() => void handleSave()} disabled={saving || loading}>
          <Save size={16} style={{ marginRight: 6 }} />
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      )}
    >
      {loading ? (
        <AdminStateBlock
          type="empty"
          title="Đang tải gian hàng công khai"
          description="Hồ sơ gian hàng của shop đang được đồng bộ."
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
              <div className="admin-stat-sub">Tính theo dữ liệu đang chỉnh sửa trên gian hàng công khai</div>
            </div>
            <div className="admin-stat-card success">
              <div className="admin-stat-label">Huy hiệu</div>
              <div className="admin-stat-value">{storeMeta?.isOfficial ? 'Chính hãng' : 'Tiêu chuẩn'}</div>
              <div className="admin-stat-sub">Tín hiệu tin cậy hiển thị trên hồ sơ công khai</div>
            </div>
            <div className="admin-stat-card info">
              <div className="admin-stat-label">Đường dẫn gian hàng</div>
              <div className="admin-stat-value">{storefrontPath}</div>
              <div className="admin-stat-sub">Đường dẫn truy cập gian hàng công khai trên marketplace</div>
            </div>
            <div className={`admin-stat-card ${storefrontStatus.label === 'Đang hoạt động' ? 'success' : 'warning'}`}>
              <div className="admin-stat-label">Trạng thái hiển thị</div>
              <div className="admin-stat-value">{storefrontStatus.label}</div>
              <div className="admin-stat-sub">{storefrontStatus.detail}</div>
            </div>
          </div>

          <div className="admin-panels storefront-grid">
            <div className="admin-left">
              <section className="admin-panel storefront-section-panel">
                <div className="admin-panel-head">
                  <h2>Thiết lập thương hiệu</h2>
                </div>
                <div className="form-grid">
                  <div className="form-field full storefront-upload-block">
                    <span>Banner gian hàng</span>
                    <div className="storefront-upload-actions">
                      <button
                        type="button"
                        className="admin-ghost-btn small storefront-upload-btn"
                        onClick={() => openImagePicker('banner')}
                        disabled={uploadingAsset !== null}
                      >
                        <Upload size={14} />
                        <span>{uploadingAsset === 'banner' ? 'Đang tải banner...' : 'Tải banner từ máy'}</span>
                      </button>
                      <small className="admin-muted">JPG, PNG, WEBP, GIF (tối đa 5MB).</small>
                    </div>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      hidden
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={(event) => void handleImageSelected('banner', event)}
                    />
                    {settings.storeInfo.banner ? (
                      <div className="storefront-upload-preview is-banner">
                        <img src={settings.storeInfo.banner} alt="Banner gian hàng" />
                      </div>
                    ) : (
                      <p className="admin-muted small">Chưa có banner. Hãy tải ảnh để hiển thị trên storefront.</p>
                    )}
                  </div>
                  <label className="form-field">
                    <span>Tên gian hàng</span>
                    <input
                      value={settings.storeInfo.name}
                      onChange={(e) =>
                        setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, name: e.target.value } }))
                      }
                    />
                  </label>
                  <div className="form-field storefront-upload-block">
                    <span>Logo gian hàng</span>
                    <div className="storefront-upload-actions">
                      <button
                        type="button"
                        className="admin-ghost-btn small storefront-upload-btn"
                        onClick={() => openImagePicker('logo')}
                        disabled={uploadingAsset !== null}
                      >
                        <Upload size={14} />
                        <span>{uploadingAsset === 'logo' ? 'Đang tải logo...' : 'Tải logo từ máy'}</span>
                      </button>
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      hidden
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={(event) => void handleImageSelected('logo', event)}
                    />
                    {settings.storeInfo.logo ? (
                      <div className="storefront-upload-preview is-logo">
                        <img src={settings.storeInfo.logo} alt="Logo gian hàng" />
                      </div>
                    ) : (
                      <p className="admin-muted small">Chưa có logo.</p>
                    )}
                  </div>
                  <label className="form-field full">
                    <span>Mô tả gian hàng</span>
                    <textarea
                      rows={5}
                      value={settings.storeInfo.description}
                      onChange={(e) =>
                        setSettings((current) => ({
                          ...current,
                          storeInfo: { ...current.storeInfo, description: e.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="admin-panel storefront-section-panel">
                <div className="admin-panel-head">
                  <h2>Thông tin công khai</h2>
                </div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Email liên hệ</span>
                    <input
                      value={settings.storeInfo.contactEmail}
                      onChange={(e) =>
                        setSettings((current) => ({
                          ...current,
                          storeInfo: { ...current.storeInfo, contactEmail: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Số điện thoại</span>
                    <input
                      value={settings.storeInfo.phone}
                      onChange={(e) =>
                        setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, phone: e.target.value } }))
                      }
                    />
                  </label>
                  <label className="form-field full">
                    <span>Địa chỉ hiển thị công khai</span>
                    <input
                      value={settings.storeInfo.address}
                      onChange={(e) =>
                        setSettings((current) => ({
                          ...current,
                          storeInfo: { ...current.storeInfo, address: e.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="admin-panel storefront-section-panel">
                <div className="admin-panel-head">
                  <h2>Luồng vận hành gian hàng</h2>
                </div>
                <div className="admin-card-list storefront-flow-list">
                  <div className="storefront-flow-step">
                    <span className="storefront-flow-index">1</span>
                    <div className="storefront-flow-content">
                      <p className="admin-bold">Hoàn thiện hồ sơ hiển thị</p>
                      <p className="admin-muted">Điền đủ tên, mô tả, logo, banner và thông tin liên hệ.</p>
                    </div>
                  </div>
                  <div className="storefront-flow-step">
                    <span className="storefront-flow-index">2</span>
                    <div className="storefront-flow-content">
                      <p className="admin-bold">Được admin phê duyệt</p>
                      <p className="admin-muted">Store cần được duyệt để đủ điều kiện lên công khai.</p>
                    </div>
                  </div>
                  <div className="storefront-flow-step">
                    <span className="storefront-flow-index">3</span>
                    <div className="storefront-flow-content">
                      <p className="admin-bold">Store đang hoạt động</p>
                      <p className="admin-muted">
                        Store ở trạng thái tạm offline hoặc tạm khóa sẽ không hiển thị cho người mua.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="admin-note">
                  <ShieldCheck size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                  Huy hiệu <strong>Chính hãng</strong> chỉ là tín hiệu uy tín bổ sung, không phải điều kiện bắt buộc để mở
                  gian hàng.
                </p>
              </section>
            </div>

            <div className="admin-right">
              <section className="admin-panel storefront-section-panel">
                <div className="admin-panel-head">
                  <h2>Xem trước gian hàng</h2>
                </div>
                <div className="vendor-store-preview">
                  <div
                    className="vendor-store-preview-banner"
                    style={{
                      backgroundImage: `linear-gradient(rgba(15,23,42,.22), rgba(15,23,42,.38)), url(${
                        settings.storeInfo.banner || PLACEHOLDER_STORE_BANNER
                      })`,
                    }}
                  />
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
                          {storeMeta?.isOfficial ? (
                            <span className="admin-pill teal">
                              <ShieldCheck size={13} /> Chính hãng
                            </span>
                          ) : null}
                        </div>
                        <p>{storefrontStatus.label}</p>
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

              <section className="admin-panel storefront-section-panel">
                <div className="admin-panel-head">
                  <h2>Checklist vận hành</h2>
                </div>
                {storeMeta?.approvalStatus === 'REJECTED' ? (
                  <p className="storefront-business-alert">
                    Store đang ở trạng thái <strong>Từ chối</strong>.
                    {storeMeta.rejectionReason ? ` Lý do: ${storeMeta.rejectionReason}` : ' Vui lòng cập nhật hồ sơ để gửi duyệt lại.'}
                  </p>
                ) : null}
                <div className="admin-card-list">
                  {storefrontChecklist.map((item) => (
                    <div key={item.key} className="admin-card-row storefront-check-row">
                      <div className="storefront-check-content">
                        <span className="admin-bold">{item.label}</span>
                        <span className="admin-muted">{item.hint}</span>
                      </div>
                      <span className={`admin-pill ${item.ok ? 'success' : 'warning'} storefront-check-pill`}>
                        {item.ok ? 'Đạt' : 'Chưa đạt'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className={`storefront-readiness ${isStorefrontReady ? 'success' : 'warning'}`}>
                  {isStorefrontReady
                    ? 'Gian hàng đã đủ điều kiện công khai theo logic vận hành hiện tại.'
                    : `Gian hàng mới đạt ${passedChecks}/${storefrontChecklist.length} điều kiện. Hoàn tất các mục còn thiếu trước khi đưa lên công khai.`}
                </p>
              </section>
            </div>
          </div>
        </>
      )}
    </VendorLayout>
  );
};

export default VendorStorefront;

