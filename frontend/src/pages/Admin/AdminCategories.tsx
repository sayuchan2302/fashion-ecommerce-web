import './Admin.css';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AdminLayout from './AdminLayout';
import AdminConfirmDialog from './AdminConfirmDialog';
import { AdminStateBlock } from './AdminStateBlocks';
import { useAdminToast } from './useAdminToast';
import { PanelStatsGrid, PanelTabs, PanelTableFooter } from '../../components/Panel/PanelPrimitives';

import { adminCategoryService, type Category } from './adminCategoryService';

type CategoryFilter = 'all' | 'visible' | 'hidden' | 'leaf';

interface CategoryDraft {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  status: 'visible' | 'hidden';
  showOnMenu: boolean;
  image: string;
  description: string;
}

type DraftMode = 'view' | 'edit' | 'create-root' | 'create-child';

const emptyDraft: CategoryDraft = {
  id: '',
  name: '',
  slug: '',
  parentId: null,
  order: 1,
  status: 'visible',
  showOnMenu: false,
  image: '',
  description: '',
};

const validFilters = new Set<CategoryFilter>(['all', 'visible', 'hidden', 'leaf']);

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const AdminCategories = () => {
  const { pushToast, toast } = useAdminToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>('');
  const [draftMode, setDraftMode] = useState<DraftMode>('view');
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminCategoryService.getAll();
      setCategories(data);
      setExpandedIds(new Set());
      if (data.length > 0 && !selectedId && draftMode === 'view') {
        setSelectedId(data[0].id);
      }
    } catch {
      pushToast('Lỗi tải danh sách danh mục');
    } finally {
      setIsLoading(false);
    }
  }, [draftMode, pushToast, selectedId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const byId = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  const childMap = useMemo(() => {
    const map = new Map<string, Category[]>();
    categories.forEach((item) => {
      const key = item.parentId || '__root__';
      const bucket = map.get(key) || [];
      bucket.push(item);
      map.set(key, bucket);
    });
    map.forEach((bucket) => bucket.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'vi')));
    return map;
  }, [categories]);

  const isLeaf = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((item) => {
      if (!(childMap.get(item.id)?.length)) set.add(item.id);
    });
    return set;
  }, [categories, childMap]);

  const totalProductCountByCategory = useMemo(() => {
    const memo = new Map<string, number>();

    const resolveTotal = (id: string, lineage: Set<string>): number => {
      if (memo.has(id)) {
        return memo.get(id) || 0;
      }
      if (lineage.has(id)) {
        return 0;
      }

      const current = byId.get(id);
      if (!current) {
        return 0;
      }

      const nextLineage = new Set(lineage);
      nextLineage.add(id);

      const children = childMap.get(id) || [];
      const childrenTotal = children.reduce((sum, child) => sum + resolveTotal(child.id, nextLineage), 0);
      const total = Math.max(0, Number(current.count || 0)) + childrenTotal;
      memo.set(id, total);
      return total;
    };

    categories.forEach((item) => {
      resolveTotal(item.id, new Set());
    });

    return memo;
  }, [byId, categories, childMap]);

  const getCategoryProductTotal = useCallback(
    (id: string) => totalProductCountByCategory.get(id) || 0,
    [totalProductCountByCategory],
  );

  const rootCategories = childMap.get('__root__') || [];
  const selectedCategory = selectedId ? byId.get(selectedId) || null : null;

  const stats = useMemo(
    () => ({
      all: categories.length,
      visible: categories.filter((item) => item.status === 'visible').length,
      hidden: categories.filter((item) => item.status === 'hidden').length,
      leaf: categories.filter((item) => isLeaf.has(item.id)).length,
      root: categories.filter((item) => !item.parentId).length,
    }),
    [categories, isLeaf],
  );

  const passesFilter = useCallback((item: Category) => {
    if (activeFilter === 'visible') return item.status === 'visible';
    if (activeFilter === 'hidden') return item.status === 'hidden';
    if (activeFilter === 'leaf') return isLeaf.has(item.id);
    return true;
  }, [activeFilter, isLeaf]);

  const query = search.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!query) return new Set(categories.map((item) => item.id));
    return new Set(
      categories
        .filter((item) => {
          const pathText = buildPath(item.id, byId).join(' ');
          return `${item.name} ${item.slug} ${pathText}`.toLowerCase().includes(query);
        })
        .map((item) => item.id),
    );
  }, [byId, categories, query]);

  const visibleTreeIds = useMemo(() => {
    const visible = new Set<string>();

    const markAncestors = (id: string) => {
      let cursor = byId.get(id);
      while (cursor) {
        visible.add(cursor.id);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
      }
    };

    const markDescendants = (id: string) => {
      visible.add(id);
      (childMap.get(id) || []).forEach((child) => markDescendants(child.id));
    };

    categories.forEach((item) => {
      if (passesFilter(item) && searchMatches.has(item.id)) {
        markAncestors(item.id);
        markDescendants(item.id);
      }
    });

    return visible;
  }, [byId, categories, childMap, passesFilter, searchMatches]);

  const flatFilteredCategories = useMemo(() => {
    return categories
      .filter((item) => passesFilter(item) && searchMatches.has(item.id))
      .sort((a, b) => {
        const levelDiff = getLevel(a.id, byId) - getLevel(b.id, byId);
        if (levelDiff !== 0) return levelDiff;
        return a.order - b.order || a.name.localeCompare(b.name, 'vi');
      });
  }, [byId, categories, passesFilter, searchMatches]);

  const paginatedCategories = useMemo(() => {
    const start = page * PAGE_SIZE;
    return flatFilteredCategories.slice(start, start + PAGE_SIZE);
  }, [flatFilteredCategories, page]);

  const totalPages = Math.ceil(flatFilteredCategories.length / PAGE_SIZE) || 1;

  useEffect(() => {
    setPage(0);
  }, [activeFilter, search]);



  const resetView = () => {
    setActiveFilter('all');
    setSearch('');
  };

  const openEditor = (category: Category, mode: DraftMode = 'edit') => {
    setSelectedId(category.id);
    setDraftMode(mode);
    setDraft({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      order: category.order,
      status: category.status,
      showOnMenu: category.showOnMenu,
      image: category.image,
      description: category.description,
    });
  };

  const openCreateRoot = () => {
    setDraftMode('create-root');
    setSelectedId('');
    setDraft({ ...emptyDraft, order: rootCategories.length + 1 });
  };

  const openCreateChild = (parentId: string) => {
    const siblings = childMap.get(parentId) || [];
    setDraftMode('create-child');
    setSelectedId(parentId);
    setDraft({
      ...emptyDraft,
      parentId,
      order: siblings.length + 1,
    });
    setExpandedIds((prev) => new Set(prev).add(parentId));
  };

  const saveDraft = async () => {
    if (!draft.name.trim()) {
      pushToast('Tên danh mục không được để trống.');
      return;
    }

    const normalizedSlug = toSlug(draft.slug || draft.name);
    if (!normalizedSlug) {
      pushToast('Slug không hợp lệ.');
      return;
    }

    const duplicateSlug = categories.some((item) => item.id !== draft.id && item.slug === normalizedSlug);
    if (duplicateSlug) {
      pushToast('Slug đã tồn tại.');
      return;
    }

    try {
        if (!draft.id) {
            const added = await adminCategoryService.create({
              name: draft.name.trim(),
              slug: normalizedSlug,
              parentId: draft.parentId || null,
              order: Math.max(1, draft.order),
              status: draft.status,
              showOnMenu: draft.status === 'hidden' ? false : draft.showOnMenu,
              image: draft.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
              description: draft.description.trim(),
            });
            setCategories((prev) => [...prev, added]);
            setSelectedId(added.id);
            pushToast('Đã tạo danh mục mới.');
            if (added.parentId) setExpandedIds((prev) => new Set(prev).add(added.parentId as string));
        } else {
            const updated = await adminCategoryService.update(draft.id, {
              name: draft.name.trim(),
              slug: normalizedSlug,
              parentId: draft.parentId || null,
              order: Math.max(1, draft.order),
              status: draft.status,
              showOnMenu: draft.status === 'hidden' ? false : draft.showOnMenu,
              image: draft.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
              description: draft.description.trim(),
            });
            setCategories((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            setSelectedId(updated.id);
            pushToast('Đã cập nhật danh mục.');
            if (updated.parentId) setExpandedIds((prev) => new Set(prev).add(updated.parentId as string));
        }
        setDraftMode('view');
        setDraft(emptyDraft);
    } catch {
        pushToast('Lỗi lưu danh mục.');
    }
  };

  const requestDelete = (categoryId: string) => {
    setDeleteId(categoryId);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const target = byId.get(deleteId);
    if (!target) {
      setDeleteId(null);
      return;
    }
    const hasChildren = Boolean(childMap.get(deleteId)?.length);
    if (hasChildren) {
      pushToast('Không thể xóa danh mục còn danh mục con.');
      setDeleteId(null);
      return;
    }
    if (target.count > 0) {
      pushToast('Không thể xóa danh mục đang còn sản phẩm.');
      setDeleteId(null);
      return;
    }

    try {
        await adminCategoryService.delete(deleteId);
        setCategories((prev) => prev.filter((item) => item.id !== deleteId));
        if (selectedId === deleteId) {
          setSelectedId('');
          setDraftMode('view');
          setDraft(emptyDraft);
        }
        pushToast('Đã xóa danh mục.');
    } catch {
        pushToast('Lỗi khi xóa danh mục.');
    } finally {
        setDeleteId(null);
    }
  };

  const toggleVisibility = async (categoryId: string) => {
    const item = byId.get(categoryId);
    if (!item) return;

    try {
        const newStatus = item.status === 'visible' ? 'hidden' : 'visible';
        const newShowOnMenu = newStatus === 'visible' ? item.showOnMenu : false;
        
        const updated = await adminCategoryService.updateStatus(categoryId, newStatus, newShowOnMenu);
        
        setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)));
        pushToast('Đã cập nhật trạng thái danh mục.');
    } catch {
        pushToast('Lỗi cập nhật trạng thái.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const collectDescendants = (nodeId: string, bucket: Set<string>) => {
        const children = childMap.get(nodeId) || [];
        children.forEach((child) => {
          if (bucket.has(child.id)) return;
          bucket.add(child.id);
          collectDescendants(child.id, bucket);
        });
      };

      if (prev.has(id)) {
        const toRemove = new Set<string>([id]);
        collectDescendants(id, toRemove);
        const next = new Set(prev);
        toRemove.forEach((nodeId) => next.delete(nodeId));
        return next;
      }

      const next = new Set<string>();
      let cursor = byId.get(id);
      while (cursor?.parentId) {
        next.add(cursor.parentId);
        cursor = byId.get(cursor.parentId);
      }
      next.add(id);
      return next;
    });
  };

  const renderTree = (items: Category[], level = 1) =>
    items
      .filter((item) => visibleTreeIds.has(item.id))
      .map((item) => {
        const children = (childMap.get(item.id) || []).filter((child) => visibleTreeIds.has(child.id));
        const expanded = expandedIds.has(item.id);
        const active = selectedId === item.id && draftMode === 'view';
        return (
          <div key={item.id}>
            <div className={`category-tree-item ${active ? 'active' : ''}`} style={{ paddingLeft: `${12 + (level - 1) * 18}px` }}>
              <span className="category-tree-expander">
                {children.length > 0 ? (
                  <button
                    type="button"
                    className="admin-icon-btn subtle small"
                    onClick={() => toggleExpand(item.id)}
                    aria-label={expanded ? 'Thu gọn danh mục' : 'Mở rộng danh mục'}
                  >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <span className="category-tree-bullet" />
                )}
              </span>
              <button
                type="button"
                className="category-tree-main"
                onClick={() => {
                  setSelectedId(item.id);
                  setDraftMode('view');
                }}
              >
                <div className="category-tree-meta">
                  <span className="category-tree-name">{item.name}</span>
                  <span className="category-tree-sub">Cấp {getLevel(item.id, byId)} · {isLeaf.has(item.id) ? 'Danh mục lá' : `${children.length} nhánh con`}</span>
                </div>
              </button>
              <div className="category-tree-trailing">
                <span className={`admin-pill ${item.status === 'visible' ? 'success' : 'neutral'}`}>{item.status === 'visible' ? 'Đang hiện' : 'Đã ẩn'}</span>
                <span className="category-tree-count">{getCategoryProductTotal(item.id)} SP</span>
                <div className="admin-actions">
                  <button type="button" className="admin-icon-btn subtle" title="Thêm danh mục con" aria-label="Thêm danh mục con" onClick={() => openCreateChild(item.id)}>
                    <FolderPlus size={15} />
                  </button>
                  <button type="button" className="admin-icon-btn subtle" title="Chỉnh sửa" aria-label="Chỉnh sửa" onClick={() => openEditor(item)}>
                    <Pencil size={15} />
                  </button>
                </div>
              </div>
            </div>
            {children.length > 0 && expanded ? renderTree(children, level + 1) : null}
          </div>
        );
      });

  const deleteTarget = deleteId ? byId.get(deleteId) || null : null;
  const selectedPath = selectedCategory ? buildPath(selectedCategory.id, byId) : [];
  const draftParentLabel = draft.parentId ? byId.get(draft.parentId)?.name || 'Không xác định' : 'Danh mục gốc';

  return (
    <AdminLayout
      title="Danh mục"
      breadcrumbs={['Danh mục toàn sàn', 'Quản lý hệ danh mục']}
      actions={<button className="admin-primary-btn" onClick={openCreateRoot}><Plus size={14} /> Thêm danh mục gốc</button>}
    >
      <PanelStatsGrid
        items={[
          { key: 'all', label: 'Tổng danh mục', value: stats.all, sub: 'Toàn bộ danh mục đang quản lý' },
          { key: 'root', label: 'Danh mục gốc', value: stats.root, sub: 'Cấp 1 điều hướng toàn sàn', tone: 'info' },
          { key: 'leaf', label: 'Danh mục lá', value: stats.leaf, sub: 'Nhà bán hàng chỉ được chọn nhóm này', tone: 'success', onClick: () => setActiveFilter('leaf') },
          { key: 'hidden', label: 'Đã ẩn', value: stats.hidden, sub: 'Nhóm đang tạm ngưng phân phối', tone: stats.hidden > 0 ? 'warning' : '' },
        ]}
      />

      <PanelTabs
        items={[
          { key: 'all', label: 'Tất cả', count: stats.all },
          { key: 'visible', label: 'Đang hiện', count: stats.visible },
          { key: 'hidden', label: 'Đã ẩn', count: stats.hidden },
          { key: 'leaf', label: 'Danh mục lá', count: stats.leaf },
        ]}
        activeKey={activeFilter}
        onChange={(key) => setActiveFilter((validFilters.has(key as CategoryFilter) ? key : 'all') as CategoryFilter)}
      />

      <section className="admin-panels category-manager-layout">
        <div className="admin-panel category-tree-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Cây danh mục</h2>
            </div>
          </div>
          <div className="admin-search category-search">
            <input
              placeholder="Tìm theo tên, slug hoặc đường dẫn"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Tìm theo tên, slug hoặc đường dẫn"
            />
          </div>
          {isLoading ? (
            <AdminStateBlock type="empty" title="Đang tải dữ liệu" description="Hệ thống đang tải cây danh mục..." />
          ) : visibleTreeIds.size === 0 ? (
            <AdminStateBlock
              type={query ? 'search-empty' : 'empty'}
              title={query ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}
              description={query ? 'Thử đổi từ khóa tìm kiếm hoặc xóa bộ lọc hiện tại.' : 'Hệ danh mục toàn sàn sẽ hiển thị tại đây dưới dạng cây.'}
              actionLabel="Xóa bộ lọc"
              onAction={resetView}
            />
          ) : (
            <div className="category-tree-wrap">{renderTree(rootCategories)}</div>
          )}
        </div>

        <div className="admin-panel category-detail-panel">
          <div className="admin-panel-head">
            <div>
              <h2>{draftMode === 'view' ? 'Chi tiết danh mục' : draftMode === 'edit' ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</h2>
              <span className="admin-muted">
                {draftMode === 'view' ? 'Theo dõi cấu trúc, sản phẩm đang gắn và hành động quản trị nhanh.' : 'Cập nhật thông tin danh mục, đường dẫn cha và trạng thái hiển thị.'}
              </span>
            </div>
          </div>

          {draftMode === 'view' && selectedCategory ? (
            <div className="category-detail-body">
              <div className="category-detail-hero">
                <img src={selectedCategory.image} alt={selectedCategory.name} />
                <div className="category-detail-headings">
                  <p className="drawer-eyebrow">Nút danh mục</p>
                  <h3>{selectedCategory.name}</h3>
                  <div className="category-path">{selectedPath.join(' > ')}</div>
                </div>
                <span className={`admin-pill ${selectedCategory.status === 'visible' ? 'success' : 'neutral'}`}>{selectedCategory.status === 'visible' ? 'Đang hiện' : 'Đã ẩn'}</span>
              </div>

              <div className="category-signal-grid">
                <div className="category-signal-card"><span className="admin-muted small">Cấp</span><strong>Cấp {getLevel(selectedCategory.id, byId)}</strong></div>
                <div className="category-signal-card"><span className="admin-muted small">Sản phẩm</span><strong>{getCategoryProductTotal(selectedCategory.id)}</strong></div>
                <div className="category-signal-card"><span className="admin-muted small">Điều hướng</span><strong>{selectedCategory.showOnMenu ? 'Hiện menu' : 'Ẩn menu'}</strong></div>
                <div className="category-signal-card"><span className="admin-muted small">Loại danh mục</span><strong>{isLeaf.has(selectedCategory.id) ? 'Danh mục lá' : 'Nhóm cha'}</strong></div>
              </div>

              <div className="admin-card-list">
                <div className="admin-card-row"><span className="admin-bold">Slug</span><span className="admin-muted">{selectedCategory.slug}</span></div>
                <div className="admin-card-row"><span className="admin-bold">Danh mục cha</span><span className="admin-muted">{selectedCategory.parentId ? byId.get(selectedCategory.parentId)?.name || 'Không xác định' : 'Danh mục gốc'}</span></div>
                <div className="admin-card-row"><span className="admin-bold">Thứ tự hiển thị</span><span className="admin-muted">{selectedCategory.order}</span></div>
                <div className="admin-card-row"><span className="admin-bold">Mô tả</span><span className="admin-muted">{selectedCategory.description || 'Chưa có mô tả'}</span></div>
              </div>

              <div className="category-detail-actions">
                <button className="admin-primary-btn" onClick={() => openEditor(selectedCategory, 'edit')}><Pencil size={14} />Chỉnh sửa</button>
                <button className="admin-ghost-btn" onClick={() => openCreateChild(selectedCategory.id)}><FolderPlus size={14} />Thêm danh mục con</button>
                <button className={`admin-ghost-btn ${selectedCategory.status === 'visible' ? '' : 'danger'}`} onClick={() => toggleVisibility(selectedCategory.id)}>{selectedCategory.status === 'visible' ? <EyeOff size={14} /> : <Eye size={14} />}{selectedCategory.status === 'visible' ? 'Ẩn danh mục' : 'Hiện danh mục'}</button>
                <button className="admin-ghost-btn danger" onClick={() => requestDelete(selectedCategory.id)}><Trash2 size={14} />Xóa</button>
              </div>
            </div>
          ) : (
            <div className="category-editor">
              <div className="form-grid">
                <label className="form-field"><span>Tên danh mục</span><input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value, slug: prev.slug ? prev.slug : toSlug(event.target.value) }))} /></label>
                <label className="form-field"><span>Slug</span><input value={draft.slug} onChange={(event) => setDraft((prev) => ({ ...prev, slug: toSlug(event.target.value) }))} /></label>
                <label className="form-field"><span>Danh mục cha</span><select value={draft.parentId || ''} onChange={(event) => setDraft((prev) => ({ ...prev, parentId: event.target.value || null }))}><option value="">Danh mục gốc</option>{categories.filter((item) => item.id !== draft.id).map((item) => <option key={item.id} value={item.id}>{buildPath(item.id, byId).join(' > ')}</option>)}</select></label>
                <label className="form-field"><span>Thứ tự hiển thị</span><input type="number" min={1} value={draft.order} onChange={(event) => setDraft((prev) => ({ ...prev, order: Math.max(1, Number(event.target.value) || 1) }))} /></label>
                <label className="form-field"><span>Trạng thái</span><select value={draft.status} onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as 'visible' | 'hidden' }))}><option value="visible">Đang hiện</option><option value="hidden">Đã ẩn</option></select></label>
                <label className="form-field"><span>Ảnh đại diện</span><input value={draft.image} onChange={(event) => setDraft((prev) => ({ ...prev, image: event.target.value }))} placeholder="https://..." /></label>
                <label className="form-field full"><span>Mô tả ngắn</span><textarea rows={4} value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} /></label>
              </div>

              <div className="switch-row category-switch-row">
                <div>
                  <p className="admin-bold">Hiện trên menu chính</p>
                  <p className="admin-muted small">Dùng cho các danh mục cấp điều hướng, không nên bật tràn lan với danh mục lá.</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={draft.showOnMenu} onChange={(event) => setDraft((prev) => ({ ...prev, showOnMenu: event.target.checked }))} disabled={draft.status === 'hidden'} />
                  <span className="switch-slider" />
                </label>
              </div>

              <div className="admin-card-list">
                <div className="admin-card-row"><span className="admin-bold">Đường dẫn dự kiến</span><span className="admin-muted">{buildDraftPath(draft, byId).join(' > ') || 'Danh mục mới'}</span></div>
                <div className="admin-card-row"><span className="admin-bold">Danh mục cha</span><span className="admin-muted">{draftParentLabel}</span></div>
              </div>

              <div className="drawer-footer category-editor-footer">
                <button className="admin-ghost-btn" onClick={() => setDraftMode(selectedCategory ? 'view' : 'create-root')}>Hủy</button>
                <button className="admin-primary-btn" onClick={saveDraft}>{draft.id ? 'Lưu thay đổi' : 'Tạo danh mục'}</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Danh sách rà soát danh mục</h2>
            </div>
          </div>
              {flatFilteredCategories.length === 0 ? (
            <AdminStateBlock
              type={query ? 'search-empty' : 'empty'}
              title={query ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có dữ liệu danh mục'}
              description={query ? 'Thử đổi từ khóa hoặc xóa bộ lọc để xem toàn bộ danh mục.' : 'Các nút danh mục sẽ hiển thị tại đây để rà soát nhanh.'}
              actionLabel="Xóa bộ lọc"
              onAction={resetView}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label="Bảng danh sách danh mục">
                <div className="admin-table-row taxonomy-audit admin-table-head" role="row">
                  <div role="columnheader">STT</div>
                  <div role="columnheader">Danh mục</div>
                  <div role="columnheader">Đường dẫn</div>
                  <div role="columnheader">Cấp</div>
                  <div role="columnheader">Sản phẩm</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader">Hành động</div>
                </div>
                {paginatedCategories.map((item, index) => (
                  <motion.div key={item.id} className="admin-table-row taxonomy-audit" role="row">
                    <div role="cell" className="admin-mono">{page * PAGE_SIZE + index + 1}</div>
                    <div role="cell"><div className="admin-bold">{item.name}</div><div className="admin-muted small">{item.slug}</div></div>
                    <div role="cell" className="admin-muted">{buildPath(item.id, byId).join(' > ')}</div>
                    <div role="cell"><span className="badge gray">Cấp {getLevel(item.id, byId)}</span></div>
                    <div role="cell"><span className="badge blue">{getCategoryProductTotal(item.id)} SP</span></div>
                    <div role="cell"><span className={`admin-pill ${item.status === 'visible' ? 'success' : 'neutral'}`}>{item.status === 'visible' ? 'Đang hiện' : 'Đã ẩn'}</span></div>
                    <div role="cell" className="admin-actions">
                      <button className="admin-icon-btn subtle" title="Xem chi tiết" aria-label="Xem chi tiết" onClick={() => setSelectedId(item.id)}><ChevronRight size={16} /></button>
                      <button className="admin-icon-btn subtle" title="Chỉnh sửa" aria-label="Chỉnh sửa" onClick={() => openEditor(item)}><Pencil size={16} /></button>
                      <button className="admin-icon-btn subtle" title={item.status === 'visible' ? 'Ẩn danh mục' : 'Hiện danh mục'} aria-label={item.status === 'visible' ? 'Ẩn danh mục' : 'Hiện danh mục'} onClick={() => toggleVisibility(item.id)}>{item.status === 'visible' ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      <button className="admin-icon-btn subtle danger-icon" title="Xóa" aria-label="Xóa" onClick={() => requestDelete(item.id)}><Trash2 size={16} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
              <PanelTableFooter
                meta={`Trang ${page + 1}/${totalPages} · ${paginatedCategories.length} danh mục/trang`}
                page={page + 1}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p - 1)}
                prevLabel="Trước"
                nextLabel="Sau"
              />
            </>
          )}
        </div>
      </section>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa danh mục"
        description="Chỉ nên xóa khi danh mục không còn danh mục con và không còn sản phẩm đang gắn."
        selectedItems={deleteTarget ? [deleteTarget.name] : undefined}
        selectedNoun="danh mục"
        confirmLabel="Xác nhận xóa"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <AnimatePresence>{toast ? <div className="toast success">{toast}</div> : null}</AnimatePresence>
    </AdminLayout>
  );
};

function getLevel(id: string, byId: Map<string, Category>) {
  let level = 1;
  let cursor = byId.get(id);
  while (cursor?.parentId) {
    level += 1;
    cursor = byId.get(cursor.parentId);
  }
  return level;
}

function buildPath(id: string, byId: Map<string, Category>) {
  const names: string[] = [];
  let cursor = byId.get(id);
  while (cursor) {
    names.unshift(cursor.name);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return names;
}

function buildDraftPath(draft: CategoryDraft, byId: Map<string, Category>) {
  const parentPath = draft.parentId ? buildPath(draft.parentId, byId) : [];
  if (draft.name.trim()) return [...parentPath, draft.name.trim()];
  return parentPath;
}

export default AdminCategories;

