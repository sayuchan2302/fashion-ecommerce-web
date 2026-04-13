import './AdminFinancials.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Eye, WalletCards, X } from 'lucide-react';
import AdminLayout from './AdminLayout';
import AdminConfirmDialog from './AdminConfirmDialog';
import { AdminStateBlock } from './AdminStateBlocks';
import { PanelStatsGrid, PanelTabs } from '../../components/Panel/PanelPrimitives';
import { useToast } from '../../contexts/ToastContext';
import Drawer from '../../components/Drawer/Drawer';
import { walletService, type VendorWallet, type PayoutRequest } from '../../services/walletService';
import { adminDashboardService } from '../../services/adminDashboardService';

interface FinancialSnapshot {
  gmv: number;
  commission: number;
  review: number;
  pendingPayoutTotal: number;
  pendingPayoutCount: number;
}

type ConfirmState = {
  storeIds: string[];
  storeNames: string[];
};

type AdminTab = 'wallets' | 'payouts';

const formatCurrency = (value: number) =>
  value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
const STORE_REF_FALLBACK = 'chua-co-slug';
const toStoreRef = (record: VendorWallet) => `@${record.storeSlug?.trim() || STORE_REF_FALLBACK}`;
const PAGE_SIZE = 20;

const AdminFinancials = () => {
  const { addToast } = useToast();
  const [wallets, setWallets] = useState<VendorWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailRecord, setDetailRecord] = useState<VendorWallet | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<AdminTab>('wallets');
  const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot>({
    gmv: 0,
    commission: 0,
    review: 0,
    pendingPayoutTotal: 0,
    pendingPayoutCount: 0,
  });

  const [pendingPayouts, setPendingPayouts] = useState<PayoutRequest[]>([]);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutTotalPages, setPayoutTotalPages] = useState(1);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isApplyingPayout, setIsApplyingPayout] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [walletPage, dashboard, payoutSummary] = await Promise.all([
        walletService.getAdminWallets(search.trim(), page, PAGE_SIZE),
        adminDashboardService.get(),
        walletService.getPayoutSummary(),
      ]);

      setWallets(walletPage.content || []);
      setTotalPages(Math.max(Number(walletPage.totalPages || 1), 1));
      setFinancialSnapshot({
        gmv: Number(dashboard.metrics.gmvDelivered || 0),
        commission: Number(dashboard.metrics.commissionDelivered || 0),
        review: Number(dashboard.quickViews.parentOrdersNeedAttention || 0),
        pendingPayoutTotal: Number(payoutSummary.pendingTotal || 0),
        pendingPayoutCount: Number(payoutSummary.pendingCount || 0),
      });
    } catch {
      setWallets([]);
      setTotalPages(1);
      setFinancialSnapshot({ gmv: 0, commission: 0, review: 0, pendingPayoutTotal: 0, pendingPayoutCount: 0 });
      addToast('Lỗi khi tải dữ liệu đối soát.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast, page, search]);

  const fetchPendingPayouts = useCallback(async () => {
    try {
      const result = await walletService.getPendingPayouts(payoutPage, PAGE_SIZE);
      setPendingPayouts(result.content || []);
      setPayoutTotalPages(Math.max(Number(result.totalPages || 1), 1));
    } catch {
      setPendingPayouts([]);
    }
  }, [payoutPage]);

  const fetchAllPendingPayouts = useCallback(async () => {
    const allPending: PayoutRequest[] = [];
    let currentPage = 1;
    let total = 1;

    do {
      const result = await walletService.getPendingPayouts(currentPage, PAGE_SIZE);
      allPending.push(...(result.content || []));
      total = Math.max(Number(result.totalPages || 1), 1);
      currentPage += 1;
    } while (currentPage <= total);

    return allPending;
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'payouts') {
      void fetchPendingPayouts();
    }
  }, [activeTab, fetchPendingPayouts]);

  const records = useMemo(() => wallets, [wallets]);

  const totals = useMemo(() => ({
    gmv: financialSnapshot.gmv,
    commission: financialSnapshot.commission,
    payout: records.reduce((sum, record) => sum + record.availableBalance, 0),
    review: financialSnapshot.review,
    pendingPayoutTotal: financialSnapshot.pendingPayoutTotal,
    pendingPayoutCount: financialSnapshot.pendingPayoutCount,
  }), [financialSnapshot, records]);

  const resetCurrentView = () => {
    setSearch('');
    setActiveTab('wallets');
    setSelected(new Set());
    setPage(1);
  };

  const openReleaseConfirm = (storeIds: string[]) => {
    const items = records.filter((record) => storeIds.includes(record.storeId) && record.availableBalance > 0);
    if (items.length === 0) {
      addToast('Không có ví nào có số dư khả dụng để giải ngân.', 'info');
      return;
    }

    setConfirmState({
      storeIds: items.map((item) => item.storeId),
      storeNames: items.map((item) => item.storeName),
    });
  };

  const applyPayout = async () => {
    if (!confirmState || isApplyingPayout) return;

    const storeIds = new Set(confirmState.storeIds);

    try {
      setIsApplyingPayout(true);
      const allPending = await fetchAllPendingPayouts();
      const targetRequests = allPending.filter((request) => request.status === 'PENDING' && storeIds.has(request.storeId));

      if (targetRequests.length === 0) {
        addToast('Không tìm thấy yêu cầu rút tiền PENDING cho các store đã chọn.', 'info');
        setSelected(new Set());
        setConfirmState(null);
        return;
      }

      const approvalResults = await Promise.allSettled(
        targetRequests.map((request) => walletService.approvePayoutRequest(request.id)),
      );

      const approvedCount = approvalResults.filter((result) => result.status === 'fulfilled').length;
      const failedCount = approvalResults.length - approvedCount;

      if (approvedCount > 0) {
        addToast(`Đã duyệt ${approvedCount} yêu cầu rút tiền.`, 'success');
      }
      if (failedCount > 0) {
        addToast(`Có ${failedCount} yêu cầu duyệt thất bại. Vui lòng thử lại.`, 'error');
      }

      setSelected(new Set());
      setConfirmState(null);
      await Promise.all([fetchData(), fetchPendingPayouts()]);
    } catch {
      addToast('Lỗi trong quá trình giải ngân.', 'error');
    } finally {
      setIsApplyingPayout(false);
    }
  };

  const handleApprovePayout = async (payout: PayoutRequest) => {
    try {
      await walletService.approvePayoutRequest(payout.id);
      addToast(`Đã duyệt yêu cầu rút tiền cho ${payout.storeName}.`, 'success');
      await fetchPendingPayouts();
      await fetchData();
    } catch {
      addToast('Không thể duyệt yêu cầu rút tiền.', 'error');
    }
  };

  const handleRejectPayout = async (payout: PayoutRequest) => {
    if (!rejectNote.trim()) {
      addToast('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    try {
      await walletService.rejectPayout(payout.id, rejectNote.trim());
      addToast(`Đã từ chối yêu cầu rút tiền cho ${payout.storeName}.`, 'info');
      setSelectedPayout(null);
      setRejectNote('');
      await fetchPendingPayouts();
      await fetchData();
    } catch {
      addToast('Không thể từ chối yêu cầu rút tiền.', 'error');
    }
  };

  return (
    <AdminLayout
      title="Tài chính sàn"
      breadcrumbs={['Tài chính sàn', 'Đối soát và giải ngân']}
    >
      <PanelStatsGrid
        items={[
          { key: 'gmv', label: 'GMV toàn sàn', value: formatCurrency(totals.gmv), sub: 'Tổng giá trị đơn hàng từ bảng vận hành hiện tại' },
          { key: 'commission', label: 'Commission thực thu', value: formatCurrency(totals.commission), sub: 'Tổng phí sàn từ các đơn đã hoàn tất', tone: 'info' },
          { key: 'payout', label: 'Payout khả dụng', value: formatCurrency(totals.payout), sub: 'Tổng số tiền đủ điều kiện giải ngân cho shop', tone: 'success' },
          { key: 'pending', label: 'Yêu cầu rút tiền chờ', value: totals.pendingPayoutCount, sub: formatCurrency(totals.pendingPayoutTotal), tone: totals.pendingPayoutCount > 0 ? 'warning' : '' },
        ]}
      />

      <PanelTabs
        items={[
          { key: 'wallets', label: 'Ví store', count: records.length },
          { key: 'payouts', label: 'Chờ duyệt rút tiền', count: totals.pendingPayoutCount },
        ]}
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as AdminTab);
          setSelected(new Set());
          setPage(1);
        }}
      />

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>{activeTab === 'wallets' ? 'Sổ đối soát và commission' : 'Yêu cầu rút tiền chờ duyệt'}</h2>
            
          </div>

          {activeTab === 'wallets' ? (
            <>
              {isLoading ? (
                <AdminStateBlock type="empty" title="Đang tải dữ liệu ví" description="Hệ thống đang đồng bộ dữ liệu ví từ backend." />
              ) : records.length === 0 ? (
                <AdminStateBlock
                  type={search.trim() ? 'search-empty' : 'empty'}
                  title={search.trim() ? 'Không tìm thấy bản ghi tài chính phù hợp' : 'Chưa có bản ghi tài chính'}
                  description={search.trim() ? 'Thử đổi từ khóa hoặc đặt lại bộ lọc.' : 'Bản ghi tài chính sẽ xuất hiện khi có dữ liệu đơn hàng.'}
                  actionLabel="Đặt lại bộ lọc"
                  onAction={resetCurrentView}
                />
              ) : (
                <>
                  <div className="admin-table" role="table" aria-label="Bảng đối soát tài chính sàn">
                    <div className="admin-table-row financials admin-table-head" role="row">
                      <div role="columnheader">
                        <input
                          type="checkbox"
                          checked={selected.size === records.length && records.length > 0}
                          onChange={(event) => setSelected(event.target.checked ? new Set(records.map((item) => item.storeId)) : new Set())}
                        />
                      </div>
                      <div role="columnheader">Slug cửa hàng</div>
                      <div role="columnheader">Tên Cửa hàng</div>
                      <div role="columnheader">Khả dụng</div>
                      <div role="columnheader">Đóng băng</div>
                      <div role="columnheader">Hành động</div>
                    </div>

                    {records.map((record) => (
                      <motion.div
                        key={record.id}
                        className="admin-table-row financials"
                        style={{ gridTemplateColumns: '40px 1.2fr 1.5fr 1fr 1fr 100px' }}
                        role="row"
                        whileHover={{ y: -1 }}
                      >
                        <div role="cell" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(record.storeId)}
                            onChange={(event) => {
                              const next = new Set(selected);
                              if (event.target.checked) next.add(record.storeId);
                              else next.delete(record.storeId);
                              setSelected(next);
                            }}
                          />
                        </div>
                        <div role="cell">
                          <div className="admin-bold">{toStoreRef(record)}</div>
                        </div>
                        <div role="cell">
                          <div className="admin-bold">{record.storeName}</div>
                        </div>
                        <div role="cell" className="admin-bold">
                          <span className={`admin-pill ${record.availableBalance > 0 ? 'success' : 'neutral'}`}>{formatCurrency(record.availableBalance)}</span>
                        </div>
                        <div role="cell">
                          <span className={`admin-pill ${record.frozenBalance > 0 ? 'warning' : 'neutral'}`}>{formatCurrency(record.frozenBalance)}</span>
                        </div>
                        <div role="cell" className="financial-actions">
                          <button className="admin-icon-btn subtle" title="Xem chi tiết" onClick={() => setDetailRecord(record)}>
                            <Eye size={16} />
                          </button>
                          {record.availableBalance > 0 && (
                            <button className="admin-icon-btn subtle" title="Giải ngân" onClick={() => openReleaseConfirm([record.storeId])}>
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {!isLoading && (
                    <div className="table-footer">
                      <span className="table-footer-meta">Trang {page}/{totalPages}</span>
                      <div className="pagination">
                        <button className="page-btn" disabled={page === 1} onClick={() => setPage((c) => Math.max(c - 1, 1))}>Trước</button>
                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                          <button key={i + 1} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                        ))}
                        <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((c) => Math.min(c + 1, totalPages))}>Sau</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {pendingPayouts.length === 0 ? (
                <AdminStateBlock type="empty" title="Không có yêu cầu rút tiền chờ duyệt" description="Tất cả yêu cầu đã được xử lý hoặc chưa có yêu cầu mới." />
              ) : (
                <>
                  <div className="admin-table" role="table" aria-label="Bảng yêu cầu rút tiền">
                    <div className="admin-table-row financials admin-table-head" role="row">
                      <div role="columnheader">Store</div>
                      <div role="columnheader">Số tiền</div>
                      <div role="columnheader">Ngân hàng</div>
                      <div role="columnheader">STK</div>
                      <div role="columnheader">Ngày yêu cầu</div>
                      <div role="columnheader">Hành động</div>
                    </div>

                    {pendingPayouts.map((payout) => (
                      <motion.div
                        key={payout.id}
                        className="admin-table-row financials"
                        style={{ gridTemplateColumns: '1.5fr 1fr 1.2fr 1fr 1fr 140px' }}
                        role="row"
                        whileHover={{ y: -1 }}
                      >
                        <div role="cell">
                          <div className="admin-bold">{payout.storeName}</div>
                          <small className="admin-muted">{toStoreRef({ storeSlug: payout.storeSlug } as VendorWallet)}</small>
                        </div>
                        <div role="cell" className="admin-bold">{formatCurrency(payout.amount)}</div>
                        <div role="cell">{payout.bankName}</div>
                        <div role="cell" className="admin-muted">{payout.bankAccountNumber}</div>
                        <div role="cell" className="admin-muted">{new Date(payout.createdAt).toLocaleString('vi-VN')}</div>
                        <div role="cell" className="financial-actions">
                          <button className="admin-icon-btn subtle" title="Xem chi tiết" onClick={() => setSelectedPayout(payout)}>
                            <Eye size={16} />
                          </button>
                          <button className="admin-icon-btn subtle" title="Duyệt" onClick={() => void handleApprovePayout(payout)}>
                            <CheckCircle2 size={16} />
                          </button>
                          <button className="admin-icon-btn subtle danger-icon" title="Từ chối" onClick={() => { setSelectedPayout(payout); setRejectNote(''); }}>
                            <X size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="table-footer">
                    <span className="table-footer-meta">Trang {payoutPage}/{payoutTotalPages}</span>
                    <div className="pagination">
                      <button className="page-btn" disabled={payoutPage === 1} onClick={() => setPayoutPage((c) => Math.max(c - 1, 1))}>Trước</button>
                      {Array.from({ length: Math.min(payoutTotalPages, 5) }).map((_, i) => (
                        <button key={i + 1} className={`page-btn ${payoutPage === i + 1 ? 'active' : ''}`} onClick={() => setPayoutPage(i + 1)}>{i + 1}</button>
                      ))}
                      <button className="page-btn" disabled={payoutPage === payoutTotalPages} onClick={() => setPayoutPage((c) => Math.min(c + 1, payoutTotalPages))}>Sau</button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      <AdminConfirmDialog
        open={Boolean(confirmState)}
        title="Xác nhận giải ngân payout"
        description="Số dư khả dụng trên ví của các store sẽ bị trừ để ghi nhận đã giải ngân cho nhà bán hàng."
        selectedItems={confirmState?.storeNames}
        selectedNoun="bản ghi tài chính"
        confirmLabel={isApplyingPayout ? 'Đang duyệt...' : 'Xác nhận giải ngân'}
        confirmDisabled={isApplyingPayout}
        cancelDisabled={isApplyingPayout}
        onCancel={() => {
          if (isApplyingPayout) return;
          setConfirmState(null);
        }}
        onConfirm={() => void applyPayout()}
      />

      <Drawer open={Boolean(detailRecord)} onClose={() => setDetailRecord(null)} className="financial-drawer">
        {detailRecord ? (
          <>
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">Chi tiết tài chính</p>
                <h3>{detailRecord.storeName}</h3>
              </div>
              <button className="admin-icon-btn" onClick={() => setDetailRecord(null)} aria-label="Đóng chi tiết tài chính">
                <X size={16} />
              </button>
            </div>

            <div className="drawer-body">
              <section className="drawer-section">
                <h4>Tổng quan ví điện tử</h4>
                <div className="financial-drawer-hero">
                  <div className="financial-avatar">
                    <WalletCards size={22} />
                  </div>
                  <div>
                    <div className="admin-bold">Store: {toStoreRef(detailRecord)}</div>
                    <div className="admin-muted">{detailRecord.storeName}</div>
                  </div>
                  <span className={`admin-pill ${detailRecord.availableBalance > 0 ? 'success' : 'neutral'}`}>
                    {detailRecord.availableBalance > 0 ? 'Khả dụng' : 'Trống'}
                  </span>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Bảng tóm tắt ví</h4>
                <div className="financial-signal-grid">
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Khả dụng</span>
                    <strong style={{ color: '#0d9488' }}>{formatCurrency(detailRecord.availableBalance)}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Đóng băng</span>
                    <strong style={{ color: '#d97706' }}>{formatCurrency(detailRecord.frozenBalance)}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Tổng</span>
                    <strong>{formatCurrency(detailRecord.totalBalance)}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Cập nhật lúc</span>
                    <strong>{new Date(detailRecord.lastUpdated).toLocaleString('vi-VN')}</strong>
                  </div>
                </div>
              </section>
            </div>

            <div className="drawer-footer">
              <button className="admin-ghost-btn" onClick={() => setDetailRecord(null)}>Đóng</button>
              {detailRecord.availableBalance > 0 && (
                <button className="admin-primary-btn" onClick={() => openReleaseConfirm([detailRecord.storeId])}>
                  <ArrowUpRight size={14} />
                  Xác nhận giải ngân
                </button>
              )}
            </div>
          </>
        ) : null}
      </Drawer>

      <Drawer open={Boolean(selectedPayout)} onClose={() => { setSelectedPayout(null); setRejectNote(''); }} className="financial-drawer">
        {selectedPayout ? (
          <>
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">Chi tiết yêu cầu rút tiền</p>
                <h3>{selectedPayout.storeName}</h3>
              </div>
              <button className="admin-icon-btn" onClick={() => { setSelectedPayout(null); setRejectNote(''); }}>
                <X size={16} />
              </button>
            </div>

            <div className="drawer-body">
              <section className="drawer-section">
                <h4>Thông tin yêu cầu</h4>
                <div className="financial-signal-grid">
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Số tiền</span>
                    <strong>{formatCurrency(selectedPayout.amount)}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Trạng thái</span>
                    <strong>{selectedPayout.status === 'PENDING' ? 'Chờ duyệt' : selectedPayout.status}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Ngân hàng</span>
                    <strong>{selectedPayout.bankName}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">STK</span>
                    <strong>{selectedPayout.bankAccountNumber}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Chủ TK</span>
                    <strong>{selectedPayout.bankAccountName}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Ngày yêu cầu</span>
                    <strong>{new Date(selectedPayout.createdAt).toLocaleString('vi-VN')}</strong>
                  </div>
                </div>
              </section>

              {selectedPayout.status === 'PENDING' && (
                <section className="drawer-section">
                  <h4>Từ chối yêu cầu</h4>
                  <textarea
                    className="admin-textarea"
                    rows={3}
                    placeholder="Nhập lý do từ chối..."
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                  />
                </section>
              )}
            </div>

            <div className="drawer-footer">
              <button className="admin-ghost-btn" onClick={() => { setSelectedPayout(null); setRejectNote(''); }}>Đóng</button>
              {selectedPayout.status === 'PENDING' && (
                <>
                  <button className="admin-ghost-btn danger" onClick={() => void handleRejectPayout(selectedPayout)}>
                    <X size={14} /> Từ chối
                  </button>
                  <button className="admin-primary-btn" onClick={() => void handleApprovePayout(selectedPayout)}>
                    <CheckCircle2 size={14} /> Duyệt rút tiền
                  </button>
                </>
              )}
            </div>
          </>
        ) : null}
      </Drawer>
    </AdminLayout>
  );
};

export default AdminFinancials;


