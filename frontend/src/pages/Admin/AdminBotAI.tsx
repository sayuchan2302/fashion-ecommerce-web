import './Admin.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, RefreshCcw, UploadCloud, MessageSquare, FileText, Plus, Trash2, Pencil } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAdminToast } from './useAdminToast';
import {
  adminBotScenarioService,
  type BotScenarioActionKey,
  type BotScenarioPayload,
  type BotScenarioSnapshot,
} from '../../services/adminBotScenarioService';
import { contentService, type ContentPage } from '../../services/contentService';

type FaqFormState = {
  id?: string;
  title: string;
  body: string;
  keywordsText: string;
};

const QUICK_ACTION_ORDER: BotScenarioActionKey[] = ['ORDER_LOOKUP', 'SIZE_ADVICE', 'PRODUCT_FAQ'];

const QUICK_ACTION_LABEL: Record<BotScenarioActionKey, string> = {
  ORDER_LOOKUP: 'Tra cứu đơn',
  SIZE_ADVICE: 'Tư vấn size',
  PRODUCT_FAQ: 'Hỏi đáp sản phẩm',
};

const emptyFaqForm: FaqFormState = {
  title: '',
  body: '',
  keywordsText: '',
};

const parseKeywords = (input: string) =>
  input
    .split(/[,;\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatKeywords = (keywords?: string[]) => (keywords || []).join(', ');

const sortQuickActions = (payload: BotScenarioPayload): BotScenarioPayload => {
  const byKey = new Map(payload.quickActions.map((item) => [item.key, item]));
  return {
    ...payload,
    quickActions: QUICK_ACTION_ORDER.map((key) => byKey.get(key)).filter(Boolean) as BotScenarioPayload['quickActions'],
  };
};

const AdminBotAI = () => {
  const { pushToast } = useAdminToast();
  const [snapshot, setSnapshot] = useState<BotScenarioSnapshot | null>(null);
  const [draft, setDraft] = useState<BotScenarioPayload | null>(null);
  const [faqItems, setFaqItems] = useState<ContentPage[]>([]);
  const [faqForm, setFaqForm] = useState<FaqFormState>(emptyFaqForm);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingFaq, setSavingFaq] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [scenarioSnapshot, faqList] = await Promise.all([
        adminBotScenarioService.getSnapshot(),
        contentService.list('FAQ'),
      ]);
      setSnapshot(scenarioSnapshot);
      setDraft(sortQuickActions(scenarioSnapshot.draft));
      setFaqItems(faqList);
    } catch {
      pushToast('Không thể tải dữ liệu Bot/AI.');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasDraftChanged = useMemo(() => {
    if (!snapshot || !draft) return false;
    return JSON.stringify(sortQuickActions(snapshot.draft)) !== JSON.stringify(sortQuickActions(draft));
  }, [snapshot, draft]);

  const updateDraftField = <K extends keyof BotScenarioPayload>(field: K, value: BotScenarioPayload[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateQuickActionLabel = (key: BotScenarioActionKey, label: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        quickActions: current.quickActions.map((item) => (item.key === key ? { ...item, label } : item)),
      };
    });
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    try {
      setSavingDraft(true);
      const nextSnapshot = await adminBotScenarioService.saveDraft(sortQuickActions(draft));
      setSnapshot(nextSnapshot);
      setDraft(sortQuickActions(nextSnapshot.draft));
      pushToast('Đã lưu nháp kịch bản bot.');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể lưu nháp.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      const nextSnapshot = await adminBotScenarioService.publishDraft();
      setSnapshot(nextSnapshot);
      setDraft(sortQuickActions(nextSnapshot.draft));
      pushToast('Đã publish kịch bản chatbot.');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể publish.');
    } finally {
      setPublishing(false);
    }
  };

  const handleResetDraft = async () => {
    try {
      const nextSnapshot = await adminBotScenarioService.resetDraftFromPublished();
      setSnapshot(nextSnapshot);
      setDraft(sortQuickActions(nextSnapshot.draft));
      pushToast('Đã khôi phục draft theo bản published.');
    } catch {
      pushToast('Không thể khôi phục draft.');
    }
  };

  const openFaqEditor = (item?: ContentPage) => {
    if (!item) {
      setFaqForm(emptyFaqForm);
      return;
    }
    setFaqForm({
      id: item.id,
      title: item.title,
      body: item.body,
      keywordsText: formatKeywords(item.keywords),
    });
  };

  const handleSaveFaq = async () => {
    if (!faqForm.title.trim() || !faqForm.body.trim()) {
      pushToast('FAQ cần có tiêu đề và nội dung.');
      return;
    }

    const payload = {
      title: faqForm.title.trim(),
      body: faqForm.body.trim(),
      type: 'FAQ' as const,
      displayOrder: faqForm.id ? faqItems.find((item) => item.id === faqForm.id)?.displayOrder : faqItems.length + 1,
      keywords: parseKeywords(faqForm.keywordsText),
    };

    try {
      setSavingFaq(true);
      if (faqForm.id) {
        const updated = await contentService.update(faqForm.id, payload);
        setFaqItems((prev) => prev.map((item) => (item.id === faqForm.id ? updated : item)));
        pushToast('Đã cập nhật FAQ.');
      } else {
        const created = await contentService.create(payload);
        setFaqItems((prev) => [...prev, created]);
        pushToast('Đã tạo FAQ mới.');
      }
      setFaqForm(emptyFaqForm);
    } catch {
      pushToast('Không thể lưu FAQ.');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa FAQ này?')) return;
    try {
      await contentService.remove(id);
      setFaqItems((prev) => prev.filter((item) => item.id !== id));
      if (faqForm.id === id) {
        setFaqForm(emptyFaqForm);
      }
      pushToast('Đã xóa FAQ.');
    } catch {
      pushToast('Không thể xóa FAQ.');
    }
  };

  return (
    <AdminLayout title="Bot và AI" breadcrumbs={['Bot và AI', 'Quản lý kịch bản chatbot']}>
      <div className="admin-panels single">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Cấu hình kịch bản chatbot</h2>
              <p className="admin-muted">
                Draft sẽ được chỉnh sửa ở đây. Runtime chatbot chỉ dùng bản Published.
              </p>
            </div>
            <div className="admin-topbar-actions">
              <button className="admin-icon-btn subtle" onClick={() => void loadData()} title="Tải lại dữ liệu">
                <RefreshCcw size={16} />
              </button>
              <button className="admin-primary-btn dark" onClick={handleResetDraft} disabled={loading || !snapshot}>
                <RefreshCcw size={16} /> Khôi phục draft
              </button>
              <button className="admin-primary-btn" onClick={handleSaveDraft} disabled={loading || !draft || savingDraft || !hasDraftChanged}>
                <Save size={16} /> {savingDraft ? 'Đang lưu...' : 'Lưu nháp'}
              </button>
              <button className="admin-primary-btn" onClick={handlePublish} disabled={loading || publishing || !snapshot}>
                <UploadCloud size={16} /> {publishing ? 'Đang publish...' : 'Publish'}
              </button>
            </div>
          </div>

          {loading || !draft ? (
            <p className="admin-muted">Đang tải kịch bản chatbot...</p>
          ) : (
            <div className="bot-ai-grid">
              <div className="bot-ai-editor">
                <div className="bot-ai-section">
                  <h3><MessageSquare size={16} /> Prompt chính</h3>
                  <label>
                    Lời chào
                    <textarea
                      value={draft.welcomePrompt}
                      onChange={(e) => updateDraftField('welcomePrompt', e.target.value)}
                      rows={3}
                    />
                  </label>
                  <label>
                    Lời nhắn không hiểu
                    <textarea
                      value={draft.unknownPrompt}
                      onChange={(e) => updateDraftField('unknownPrompt', e.target.value)}
                      rows={2}
                    />
                  </label>
                </div>

                <div className="bot-ai-section">
                  <h3>Quick actions</h3>
                  {QUICK_ACTION_ORDER.map((key) => (
                    <label key={key}>
                      {QUICK_ACTION_LABEL[key]}
                      <input
                        value={draft.quickActions.find((item) => item.key === key)?.label || ''}
                        onChange={(e) => updateQuickActionLabel(key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>

                <div className="bot-ai-section">
                  <h3>Flow prompts</h3>
                  <label>Yêu cầu mã đơn<input value={draft.askOrderCodePrompt} onChange={(e) => updateDraftField('askOrderCodePrompt', e.target.value)} /></label>
                  <label>Yêu cầu 4 số cuối SDT<input value={draft.askOrderPhonePrompt} onChange={(e) => updateDraftField('askOrderPhonePrompt', e.target.value)} /></label>
                  <label>Sai 4 số SDT<input value={draft.orderPhoneInvalidPrompt} onChange={(e) => updateDraftField('orderPhoneInvalidPrompt', e.target.value)} /></label>
                  <label>Hỏi tiếp sau tra cứu đơn<input value={draft.orderLookupContinuePrompt} onChange={(e) => updateDraftField('orderLookupContinuePrompt', e.target.value)} /></label>
                  <label>Yêu cầu chiều cao<input value={draft.askHeightPrompt} onChange={(e) => updateDraftField('askHeightPrompt', e.target.value)} /></label>
                  <label>Sai chiều cao<input value={draft.invalidHeightPrompt} onChange={(e) => updateDraftField('invalidHeightPrompt', e.target.value)} /></label>
                  <label>Yêu cầu cân nặng<input value={draft.askWeightPrompt} onChange={(e) => updateDraftField('askWeightPrompt', e.target.value)} /></label>
                  <label>Sai cân nặng<input value={draft.invalidWeightPrompt} onChange={(e) => updateDraftField('invalidWeightPrompt', e.target.value)} /></label>
                  <label>Hỏi tiếp sau tư vấn size<input value={draft.sizeAdviceContinuePrompt} onChange={(e) => updateDraftField('sizeAdviceContinuePrompt', e.target.value)} /></label>
                  <label>Hỏi tiếp sau FAQ<input value={draft.productFaqContinuePrompt} onChange={(e) => updateDraftField('productFaqContinuePrompt', e.target.value)} /></label>
                </div>
              </div>

              <div className="bot-ai-preview">
                <h3>Preview (Published)</h3>
                <p className="admin-muted small">
                  Draft version: <strong>{snapshot?.draftMeta?.version || 0}</strong> |
                  Published version: <strong>{snapshot?.publishedMeta?.version || 0}</strong>
                </p>
                <div className="bot-ai-preview-card">
                  <p className="bot-ai-preview-title">Welcome</p>
                  <p>{snapshot?.published.welcomePrompt}</p>
                  <p className="bot-ai-preview-title">Quick actions</p>
                  <div className="bot-ai-keyword-wrap">
                    {snapshot?.published.quickActions.map((action) => (
                      <span key={action.key} className="admin-pill neutral">{action.label}</span>
                    ))}
                  </div>
                  <p className="bot-ai-preview-title">Unknown</p>
                  <p>{snapshot?.published.unknownPrompt}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>FAQ cho chatbot</h2>
              <p className="admin-muted">FAQ sử dụng module ContentPage. Match theo keywords đã normalize.</p>
            </div>
            <button className="admin-primary-btn" onClick={() => openFaqEditor()}>
              <Plus size={16} /> Tạo FAQ
            </button>
          </div>

          <div className="bot-ai-faq-layout">
            <div className="bot-ai-faq-list">
              {faqItems.length === 0 ? (
                <p className="admin-muted">Chưa có FAQ.</p>
              ) : (
                faqItems.map((item) => (
                  <div key={item.id} className="bot-ai-faq-card">
                    <div className="bot-ai-faq-card-head">
                      <h4><FileText size={14} /> {item.title}</h4>
                      <div className="admin-actions">
                        <button className="admin-icon-btn subtle" onClick={() => openFaqEditor(item)} title="Sửa FAQ">
                          <Pencil size={14} />
                        </button>
                        <button className="admin-icon-btn subtle danger-icon" onClick={() => void handleDeleteFaq(item.id)} title="Xóa FAQ">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="admin-muted">{item.body}</p>
                    <div className="bot-ai-keyword-wrap">
                      {(item.keywords || []).map((keyword) => (
                        <span key={`${item.id}-${keyword}`} className="admin-pill neutral">{keyword}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bot-ai-faq-editor">
              <h3>{faqForm.id ? 'Chỉnh sửa FAQ' : 'FAQ mới'}</h3>
              <label>
                Tiêu đề
                <input
                  value={faqForm.title}
                  onChange={(e) => setFaqForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label>
                Nội dung trả lời
                <textarea
                  value={faqForm.body}
                  onChange={(e) => setFaqForm((prev) => ({ ...prev, body: e.target.value }))}
                  rows={6}
                />
              </label>
              <label>
                Keywords (tách bởi dấu phẩy hoặc xuống dòng)
                <textarea
                  value={faqForm.keywordsText}
                  onChange={(e) => setFaqForm((prev) => ({ ...prev, keywordsText: e.target.value }))}
                  rows={4}
                />
              </label>
              <div className="admin-topbar-actions">
                <button className="admin-primary-btn dark" onClick={() => setFaqForm(emptyFaqForm)}>
                  Làm mới form
                </button>
                <button className="admin-primary-btn" onClick={() => void handleSaveFaq()} disabled={savingFaq}>
                  <Save size={16} /> {savingFaq ? 'Đang lưu...' : 'Lưu FAQ'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminBotAI;

