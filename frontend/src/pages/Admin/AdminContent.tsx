import './Admin.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, X, Save, FileText, Shield } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAdminToast } from './useAdminToast';
import { ADMIN_DICTIONARY } from './adminDictionary';
import { contentService, type ContentPage, type ContentType } from '../../services/contentService';

const mapTabToType = (tab: 'faq' | 'policy'): ContentType => (tab === 'faq' ? 'FAQ' : 'POLICY');

const AdminContent = () => {
  const t = ADMIN_DICTIONARY.content;
  const { pushToast } = useAdminToast();
  const [activeTab, setActiveTab] = useState<'faq' | 'policy'>('faq');
  const [items, setItems] = useState<ContentPage[]>([]);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<ContentPage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (tab: 'faq' | 'policy') => {
    try {
      setLoading(true);
      const list = await contentService.list(mapTabToType(tab));
      setItems(list);
    } catch {
      pushToast('Không tải được nội dung');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void fetchData(activeTab);
  }, [activeTab, fetchData]);

  const filteredItems = useMemo(() => items
    .filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.body.toLowerCase().includes(search.toLowerCase()))
    , [items, search]);

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      pushToast('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    if (editingItem) {
      const updated = await contentService.update(editingItem.id, {
        title: formData.title,
        body: formData.content,
        type: mapTabToType(activeTab),
        displayOrder: editingItem.displayOrder,
      });
      setItems(items.map((item) => (item.id === editingItem.id ? updated : item)));
      pushToast(t.messages.saved);
    } else {
      const created = await contentService.create({
        title: formData.title,
        body: formData.content,
        type: mapTabToType(activeTab),
        displayOrder: items.length + 1,
      });
      setItems([...items, created]);
      pushToast(t.messages.addSuccess);
    }
    setEditingItem(null);
    setIsCreating(false);
    setFormData({ title: '', content: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.messages.deleteConfirm)) return;
    await contentService.remove(id);
    setItems(items.filter((item) => item.id !== id));
    pushToast(t.messages.saved);
  };

  const openEdit = (item: ContentPage) => {
    setEditingItem(item);
    setFormData({ title: item.title, content: item.body });
  };

  const closeForm = () => {
    setEditingItem(null);
    setIsCreating(false);
    setFormData({ title: '', content: '' });
  };

  const tabs = [
    { key: 'faq' as const, label: t.tabs.faq, icon: FileText },
    { key: 'policy' as const, label: t.tabs.policy, icon: Shield },
  ];

  return (
    <AdminLayout
      title={t.title}
      actions={
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder="Tìm nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="admin-primary-btn" onClick={() => setIsCreating(true)}>
            <Plus size={16} /> {t.form.addNew}
          </button>
        </>
      }
    >
      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-content-list">
        {loading && <p className="admin-muted">Đang tải nội dung...</p>}
        {!loading && filteredItems.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có nội dung nào</p>
            <button className="admin-primary-btn" onClick={() => setIsCreating(true)}>
              <Plus size={16} /> Thêm nội dung đầu tiên
            </button>
          </div>
        ) : (
          filteredItems.map((item) => (
            <motion.div
              key={item.id}
              className="admin-content-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="admin-content-card-body">
                <h4>{item.title}</h4>
                <p className="admin-muted">{item.body}</p>
              </div>
              <div className="admin-content-card-actions">
                <button
                  className="admin-icon-btn subtle"
                  title={ADMIN_DICTIONARY.actionTitles.edit}
                  onClick={() => openEdit(item)}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="admin-icon-btn subtle danger-icon"
                  title={ADMIN_DICTIONARY.actionTitles.delete}
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {(editingItem || isCreating) && (
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeForm}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(editingItem || isCreating) && (
          <motion.div
            className="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">{activeTab === 'faq' ? t.tabs.faq : t.tabs.policy}</p>
                <h3>{editingItem ? t.form.edit : t.form.addNew}</h3>
              </div>
              <button className="admin-icon-btn" onClick={closeForm}><X size={18} /></button>
            </div>
            <div className="drawer-body">
              <section className="drawer-section">
                <h4>{t.form.title}</h4>
                <input
                  type="text"
                  className="content-form-input"
                  placeholder={t.form.titlePlaceholder}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </section>
              <section className="drawer-section">
                <h4>{t.form.content}</h4>
                <textarea
                  className="content-form-textarea"
                  placeholder={t.form.contentPlaceholder}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                />
              </section>
              <button className="admin-primary-btn" onClick={handleSave}>
                <Save size={16} /> {t.form.save}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminContent;
