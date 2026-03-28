import './Vendor.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Eye, EyeOff, FolderTree, Link2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import VendorLayout from './VendorLayout';
import { formatCurrency } from '../../services/commissionService';
import { AdminStateBlock, AdminTableSkeleton, AdminToast } from '../Admin/AdminStateBlocks';
import AdminConfirmDialog from '../Admin/AdminConfirmDialog';
import {
  PanelStatsGrid,
  PanelTableFooter,
  PanelTabs,
  PanelViewSummary,
} from '../../components/Panel/PanelPrimitives';
import {
  vendorProductService,
  type VendorProductCategory,
  type VendorProductQuery,
  type VendorProductRecord,
  type VendorProductStatus,
} from '../../services/vendorProductService';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import Drawer from '../../components/Drawer/Drawer';
import { copyTextToClipboard, normalizePositiveInteger } from './vendorHelpers';

type ProductTab = 'all' | 'active' | 'outOfStock' | 'draft';

interface DeleteConfirmState {
  ids: string[];
  selectedItems: string[];
  title: string;
  description: string;
  confirmLabel: string;
}

interface ProductFormState {
  id?: string;
  slug?: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  stock: number;
  image: string;
  description: string;
  visible: boolean;
}

type ProductFormErrors = {
  name?: string;
  sku?: string;
  categoryId?: string;
  price?: string;
  stock?: string;
  image?: string;
};

const PAGE_SIZE = 8;

const TABS: Array<{ key: ProductTab; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang bán' },
  { key: 'outOfStock', label: 'Hết hàng' },
  { key: 'draft', label: 'Ẩn / nháp' },
];

const normalizeTab = (value: string | null): ProductTab => {
  if (value === 'active' || value === 'outOfStock' || value === 'draft') {
    return value;
  }
  return 'all';
};

const getStatusLabel = (status: VendorProductStatus) => {
  const map: Record<VendorProductStatus, string> = {
    active: 'Đang bán',
    low: 'Sắp hết hàng',
    out: 'Hết hàng',
    draft: 'Ẩn / nháp',
  };
  return map[status];
};

const getStatusTone = (status: VendorProductStatus) => {
  const map: Record<VendorProductStatus, string> = {
    active: 'success',
    low: 'pending',
    out: 'error',
    draft: 'neutral',
  };
  return map[status];
};

const emptyForm = (): ProductFormState => ({
  name: '',
  sku: '',
  categoryId: '',
  price: 0,
  stock: 0,
  image: '',
  description: '',
  visible: true,
});

const VendorProducts = () => {
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = normalizeTab(searchParams.get('status'));
  const page = normalizePositiveInteger(searchParams.get('page'));
  const keyword = (searchParams.get('q') || '').trim();

  const [searchQuery, setSearchQuery] = useState(keyword);
  const [products, setProducts] = useState<VendorProductRecord[]>([]);
  const [categories, setCategories] = useState<VendorProductCategory[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDrawer, setShowDrawer] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    active: 0,
    draft: 0,
    outOfStock: 0,
    lowStock: 0,
  });

  const toastTimerRef = useRef<number | null>(null);

  const updateQuery = useCallback(
    (mutate: (query: URLSearchParams) => void, replace = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (searchQuery !== keyword) {
      setSearchQuery(keyword);
    }
  }, [keyword, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim() === keyword) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSelected(new Set());
      updateQuery((query) => {
        const next = searchQuery.trim();
        if (next) {
          query.set('q', next);
        } else {
          query.delete('q');
        }
        query.set('page', '1');
      }, true);
    }, 260);

    return () => window.clearTimeout(timer);
  }, [keyword, searchQuery, updateQuery]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      const rows = await vendorProductService.getCategories();
      if (!active) return;
      setCategories(rows);
    };
    void loadCategories();
    return () => {
      active = false;
    };
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const query: VendorProductQuery = {
        status: activeTab,
        keyword: keyword || undefined,
        page,
        size: PAGE_SIZE,
      };
      const response = await vendorProductService.getProducts(query);

      setProducts(response.items);
      setTotalElements(response.totalElements);
      setTotalPages(Math.max(response.totalPages, 1));
      setStatusCounts(response.statusCounts);

      setSelected((prev) => {
        const visibleIds = new Set(response.items.map((item) => item.id));
        return new Set(Array.from(prev).filter((id) => visibleIds.has(id)));
      });

      if (page > Math.max(response.totalPages, 1)) {
        updateQuery((next) => {
          next.set('page', String(Math.max(response.totalPages, 1)));
        }, true);
      }
    } catch (error: unknown) {
      const message = getUiErrorMessage(error, 'Không tải được danh sách sản phẩm của shop');
      setLoadError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, addToast, keyword, page, updateQuery]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const hasViewContext = activeTab !== 'all' || Boolean(keyword);
  const startIndex = products.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, totalElements);

  const pushToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast('');
      toastTimerRef.current = null;
    }, 2600);
  };

  const handleTabChange = (key: string) => {
    const nextTab = normalizeTab(key);
    setSelected(new Set());
    updateQuery((query) => {
      if (nextTab === 'all') {
        query.delete('status');
      } else {
        query.set('status', nextTab);
      }
      query.set('page', '1');
    });
  };

  const setPage = (nextPage: number) => {
    updateQuery((query) => {
      query.set('page', String(Math.max(1, nextPage)));
    });
  };

  const resetCurrentView = () => {
    setSearchQuery('');
    setSelected(new Set());
    setSearchParams(new URLSearchParams());
  };

  const shareCurrentView = async () => {
    const copied = await copyTextToClipboard(window.location.href);
    if (copied) {
      pushToast('Đã sao chép bộ lọc hiện tại của trang sản phẩm');
      return;
    }
    addToast('Không thể sao chép bộ lọc', 'error');
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(products.map((product) => product.id)));
      return;
    }
    setSelected(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const openCreateDrawer = () => {
    setProductForm(emptyForm());
    setFormErrors({});
    setShowDrawer(true);
  };

  const openEditDrawer = (id: string) => {
    const current = products.find((product) => product.id === id);
    if (!current) return;

    setProductForm({
      id: current.id,
      slug: current.slug,
      name: current.name,
      sku: current.sku,
      categoryId: current.categoryId || '',
      price: current.price,
      stock: current.stock,
      image: current.image,
      description: current.description,
      visible: current.visible,
    });
    setFormErrors({});
    setShowDrawer(true);
  };

  const validateForm = (form: ProductFormState) => {
    const errors: ProductFormErrors = {};
    if (!form.name.trim()) errors.name = 'Tên sản phẩm không được để trống.';
    if (!form.sku.trim()) errors.sku = 'SKU là bắt buộc để đối soát tồn kho.';
    if (!form.categoryId) errors.categoryId = 'Vui lòng chọn danh mục sản phẩm.';
    if (form.price <= 0) errors.price = 'Giá bán phải lớn hơn 0.';
    if (form.stock < 0) errors.stock = 'Tồn kho không được âm.';
    if (!form.image.trim()) errors.image = 'Vui lòng nhập ảnh đại diện sản phẩm.';
    return errors;
  };

  const saveProduct = async () => {
    const normalizedForm: ProductFormState = {
      ...productForm,
      name: productForm.name.trim(),
      sku: productForm.sku.trim().toUpperCase(),
      description: productForm.description.trim(),
      image: productForm.image.trim(),
    };

    const errors = validateForm(normalizedForm);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      if (normalizedForm.id) {
        await vendorProductService.updateProduct(normalizedForm.id, {
          name: normalizedForm.name,
          slug: normalizedForm.slug,
          sku: normalizedForm.sku,
          categoryId: normalizedForm.categoryId || undefined,
          price: normalizedForm.price,
          stock: normalizedForm.stock,
          image: normalizedForm.image,
          description: normalizedForm.description,
          visible: normalizedForm.visible,
        });
        pushToast('Đã cập nhật sản phẩm thành công');
      } else {
        await vendorProductService.createProduct({
          name: normalizedForm.name,
          sku: normalizedForm.sku,
          categoryId: normalizedForm.categoryId || undefined,
          price: normalizedForm.price,
          stock: normalizedForm.stock,
          image: normalizedForm.image,
          description: normalizedForm.description,
          visible: normalizedForm.visible,
        });
        pushToast('Đã tạo sản phẩm mới cho gian hàng');
      }

      setShowDrawer(false);
      await loadProducts();
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Không thể lưu sản phẩm'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    const current = products.find((product) => product.id === id);
    if (!current) return;

    const duplicateSku = `${current.sku}-COPY-${Date.now().toString(36).slice(-4)}`.slice(0, 50);

    setWorking(true);
    try {
      await vendorProductService.createProduct({
        name: `${current.name} bản sao`,
        sku: duplicateSku,
        categoryId: current.categoryId,
        price: current.price,
        stock: current.stock,
        image: current.image,
        description: current.description,
        visible: false,
      });

      pushToast(`Đã nhân bản SKU ${current.sku}`);
      await loadProducts();
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Không thể nhân bản sản phẩm'), 'error');
    } finally {
      setWorking(false);
    }
  };

  const applyVisibility = async (ids: string[], visible: boolean) => {
    setWorking(true);
    try {
      await Promise.all(ids.map((id) => vendorProductService.setVisibility(id, visible)));
      setSelected(new Set());
      pushToast(visible ? 'Đã mở hiển thị các sản phẩm đã chọn' : 'Đã ẩn các sản phẩm đã chọn');
      await loadProducts();
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Không thể cập nhật trạng thái hiển thị'), 'error');
    } finally {
      setWorking(false);
    }
  };

  const requestDelete = (ids: string[]) => {
    const items = products.filter((product) => ids.includes(product.id));
    if (items.length === 0) return;

    setDeleteConfirm({
      ids,
      selectedItems: items.map((item) => item.name),
      title: ids.length > 1 ? 'Xóa các sản phẩm đã chọn' : 'Xóa sản phẩm',
      description:
        ids.length > 1
          ? 'Sản phẩm sẽ được đưa về trạng thái lưu trữ (soft delete) và ẩn khỏi storefront.'
          : 'Sản phẩm sẽ được đưa về trạng thái lưu trữ (soft delete).',
      confirmLabel: ids.length > 1 ? 'Xóa sản phẩm' : 'Xóa ngay',
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setWorking(true);
    try {
      await Promise.all(deleteConfirm.ids.map((id) => vendorProductService.deleteProduct(id)));
      setSelected(new Set());
      pushToast(deleteConfirm.ids.length > 1 ? 'Đã xóa các sản phẩm đã chọn' : 'Đã xóa sản phẩm');
      setDeleteConfirm(null);
      await loadProducts();
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Không thể xóa sản phẩm'), 'error');
    } finally {
      setWorking(false);
    }
  };

  const allSelected = products.length > 0 && selected.size === products.length;

  const tabItems = TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    count: tab.key === 'all'
      ? statusCounts.all
      : tab.key === 'active'
        ? statusCounts.active
        : tab.key === 'outOfStock'
          ? statusCounts.outOfStock
          : statusCounts.draft,
  }));

  return (
    <VendorLayout
      title="Sản phẩm và tồn kho"
      breadcrumbs={['Kênh Người Bán', 'Kho']}
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder="Tìm theo tên, SKU hoặc danh mục"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ bộ lọc
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Đặt lại</button>
          <button className="admin-primary-btn vendor-admin-primary" onClick={openCreateDrawer}>
            <Plus size={14} />
            Thêm sản phẩm
          </button>
        </>
      )}
    >
      <PanelStatsGrid
        accentClassName="vendor-stat-button"
        items={[
          { key: 'all', label: 'Tổng SKU', value: statusCounts.all, sub: 'Toàn bộ danh mục của shop', onClick: () => handleTabChange('all') },
          { key: 'active', label: 'Đang bán', value: statusCounts.active, sub: 'SKU đang hiển thị trên sàn', tone: 'success', onClick: () => handleTabChange('active') },
          { key: 'stock', label: 'Sắp hết / hết hàng', value: statusCounts.outOfStock + statusCounts.lowStock, sub: 'Cần bổ sung tồn kho', tone: 'warning', onClick: () => handleTabChange('outOfStock') },
          { key: 'draft', label: 'Ẩn / nháp', value: statusCounts.draft, sub: 'SKU chưa mở bán công khai', tone: 'info', onClick: () => handleTabChange('draft') },
        ]}
      />

      <PanelTabs items={tabItems} activeKey={activeTab} onChange={handleTabChange} accentClassName="vendor-active-tab" />

      {hasViewContext && (
        <PanelViewSummary
          chips={[
            ...(activeTab !== 'all' ? [{ key: 'status', label: `Trạng thái: ${TABS.find((tab) => tab.key === activeTab)?.label || 'Tất cả'}` }] : []),
            ...(keyword ? [{ key: 'query', label: `Từ khóa: ${keyword}` }] : []),
          ]}
          clearLabel="Xóa bộ lọc"
          onClear={resetCurrentView}
        />
      )}

      <section className="admin-panels single">
        <div className="admin-panel">
        <div className="admin-panel-head">
            <div>
              <h2>Danh sách sản phẩm</h2>
            </div>
            {selected.size > 0 && (
              <div className="admin-actions">
                <span className="admin-muted">{selected.size} đã chọn</span>
                <button className="admin-ghost-btn" onClick={() => void applyVisibility(Array.from(selected), false)} disabled={working}>Ẩn</button>
                <button className="admin-ghost-btn" onClick={() => void applyVisibility(Array.from(selected), true)} disabled={working}>Hiện</button>
                <button className="admin-ghost-btn danger" onClick={() => requestDelete(Array.from(selected))} disabled={working}>Xóa</button>
              </div>
            )}
          </div>
          {loading ? (
            <AdminTableSkeleton columns={8} rows={6} />
          ) : loadError ? (
            <AdminStateBlock type="error" title="Không tải được dữ liệu sản phẩm" description={loadError} actionLabel="Tải lại" onAction={() => void loadProducts()} />
          ) : products.length === 0 ? (
            <AdminStateBlock
              type={keyword ? 'search-empty' : 'empty'}
              title={keyword ? 'Không tìm thấy SKU phù hợp' : 'Chưa có sản phẩm nào'}
              description={keyword ? 'Thử đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.' : 'Khi shop tạo sản phẩm mới, danh sách sẽ xuất hiện tại đây.'}
              actionLabel={keyword ? 'Đặt lại bộ lọc' : 'Thêm sản phẩm'}
              onAction={keyword ? resetCurrentView : openCreateDrawer}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label="Bảng sản phẩm của gian hàng">
                <div className="admin-table-row vendor-products admin-table-head" role="row">
                  <div role="columnheader">
                    <input type="checkbox" aria-label="Chọn tất cả sản phẩm" checked={allSelected} onChange={(event) => toggleSelectAll(event.target.checked)} />
                  </div>
                  <div role="columnheader">Sản phẩm</div>
                  <div role="columnheader">Danh mục</div>
                  <div role="columnheader">Giá bán</div>
                  <div role="columnheader">Tồn kho</div>
                  <div role="columnheader">Đã bán</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader">Hành động</div>
                </div>

                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    className={`admin-table-row vendor-products ${product.status === 'draft' ? 'row-muted' : ''}`}
                    role="row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.14) }}
                    whileHover={{ y: -1 }}
                    onClick={() => openEditDrawer(product.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div role="cell" onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" aria-label={`Chọn ${product.name}`} checked={selected.has(product.id)} onChange={(event) => toggleOne(product.id, event.target.checked)} />
                    </div>
                    <div role="cell" className="vendor-admin-product-cell">
                      <img src={product.image} alt={product.name} className="vendor-admin-thumb" />
                      <div className="vendor-admin-product-copy">
                        <div className="admin-bold">{product.name}</div>
                        <div className="admin-muted small">SKU: {product.sku}</div>
                      </div>
                    </div>
                    <div role="cell" className="vendor-admin-category">
                      <FolderTree size={14} />
                      <span>{product.category}</span>
                    </div>
                    <div role="cell" className="admin-bold">{formatCurrency(product.price)}</div>
                    <div role="cell">
                      <span className={`badge ${product.stock === 0 ? 'red' : product.stock < 10 ? 'amber' : 'blue'}`}>
                        {product.stock} sản phẩm
                      </span>
                    </div>
                    <div role="cell" className="admin-muted">{product.sold} đã bán</div>
                    <div role="cell">
                      <span className={`admin-pill ${getStatusTone(product.status)}`}>{getStatusLabel(product.status)}</span>
                    </div>
                    <div role="cell" className="admin-actions" onClick={(event) => event.stopPropagation()}>
                      <button className="admin-icon-btn subtle" title="Chỉnh sửa sản phẩm" onClick={() => openEditDrawer(product.id)}>
                        <Pencil size={16} />
                      </button>
                      <button className="admin-icon-btn subtle" title="Nhân bản SKU" onClick={() => void handleDuplicate(product.id)} disabled={working}>
                        <Copy size={16} />
                      </button>
                      <button className="admin-icon-btn subtle" title={product.visible ? 'Ẩn sản phẩm' : 'Hiển thị sản phẩm'} onClick={() => void applyVisibility([product.id], !product.visible)} disabled={working}>
                        {product.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button className="admin-icon-btn subtle danger-icon" title="Xóa sản phẩm" onClick={() => requestDelete([product.id])} disabled={working}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <PanelTableFooter
                meta={`Hiển thị ${startIndex}-${endIndex} trên ${totalElements} sản phẩm`}
                page={page}
                totalPages={Math.max(totalPages, 1)}
                onPageChange={setPage}
                activePageClassName="vendor-active-page"
                nextLabel="Sau"
              />
            </>
          )}
        </div>
      </section>

      <AdminConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.title || 'Xác nhận xóa'}
        description={deleteConfirm?.description || ''}
        selectedItems={deleteConfirm?.selectedItems}
        selectedNoun="sản phẩm"
        confirmLabel={deleteConfirm?.confirmLabel || 'Xóa'}
        danger
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => void confirmDelete()}
      />

      <Drawer open={showDrawer} onClose={() => setShowDrawer(false)}>
        <div className="drawer-header">
          <div>
            <p className="drawer-eyebrow">{productForm.id ? 'Chỉnh sửa SKU' : 'Tạo SKU mới'}</p>
            <h3>{productForm.name || 'Sản phẩm mới'}</h3>
          </div>
          <button className="admin-icon-btn" onClick={() => setShowDrawer(false)} aria-label="Đóng biểu mẫu sản phẩm">
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          <section className="drawer-section">
            <h4>Ảnh đại diện sản phẩm</h4>
            <div className="form-grid">
              <label className="form-field full">
                <span>URL ảnh</span>
                <input value={productForm.image} onChange={(event) => setProductForm((current) => ({ ...current, image: event.target.value }))} placeholder="https://..." />
                {formErrors.image && <small className="form-field-error">{formErrors.image}</small>}
              </label>
            </div>
          </section>

          <section className="drawer-section">
            <h4>Thông tin sản phẩm</h4>
            <div className="form-grid">
              <label className="form-field">
                <span>Tên sản phẩm</span>
                <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
                {formErrors.name && <small className="form-field-error">{formErrors.name}</small>}
              </label>
              <label className="form-field">
                <span>SKU</span>
                <input value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} />
                {formErrors.sku && <small className="form-field-error">{formErrors.sku}</small>}
              </label>

              <label className="form-field full">
                <span>Danh mục sản phẩm</span>
                <select
                  value={productForm.categoryId}
                  onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <small className="admin-muted">Chưa có danh mục. Vui lòng nhờ admin tạo danh mục trước khi đăng sản phẩm.</small>
                )}
                {formErrors.categoryId && <small className="form-field-error">{formErrors.categoryId}</small>}
              </label>

              <label className="form-field">
                <span>Giá bán</span>
                <input type="number" min={0} value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: Number(event.target.value || 0) }))} />
                {formErrors.price && <small className="form-field-error">{formErrors.price}</small>}
              </label>
              <label className="form-field">
                <span>Tồn kho</span>
                <input type="number" min={0} value={productForm.stock} onChange={(event) => setProductForm((current) => ({ ...current, stock: Number(event.target.value || 0) }))} />
                {formErrors.stock && <small className="form-field-error">{formErrors.stock}</small>}
              </label>
              <label className="form-field full">
                <span>Mô tả nhanh cho đội vận hành</span>
                <textarea rows={4} value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} placeholder="Điểm khác biệt, chất liệu, lưu ý fulfillment..." />
              </label>
            </div>
          </section>

          <section className="drawer-section">
            <h4>Trạng thái hiển thị</h4>
            <div className="switch-row">
              <div>
                <p className="admin-bold">Hiển thị trên storefront</p>
                <p className="admin-muted small">Nếu tắt, SKU sẽ chuyển về trạng thái ẩn / nháp trong kênh người bán.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={productForm.visible} onChange={(event) => setProductForm((current) => ({ ...current, visible: event.target.checked }))} />
                <span className="switch-slider" />
              </label>
            </div>
          </section>
        </div>

        <div className="drawer-footer">
          <button className="admin-ghost-btn" onClick={() => setShowDrawer(false)} disabled={saving}>Hủy</button>
          <button
            className="admin-primary-btn vendor-admin-primary"
            onClick={() => void saveProduct()}
            disabled={saving || categories.length === 0}
          >
            {saving ? 'Đang lưu...' : productForm.id ? 'Lưu cập nhật' : 'Tạo sản phẩm'}
          </button>
        </div>
      </Drawer>

      <AdminToast toast={toast} />
    </VendorLayout>
  );
};

export default VendorProducts;
