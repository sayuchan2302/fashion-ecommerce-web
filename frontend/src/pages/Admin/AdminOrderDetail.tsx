import './Admin.css';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { Printer, XCircle, RotateCcw, Truck, User, Copy, Download } from 'lucide-react';
import {
  canTransitionFulfillment,
  fulfillmentLabel,
  fulfillmentTransitions,
  paymentLabel,
  shipLabel,
  type FulfillmentStatus,
  type PaymentStatus,
} from './orderWorkflow';
import { adminOrdersData } from './adminOrdersData';
import { AdminStateBlock } from './AdminStateBlocks';

const formatVND = (n: number) => n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

type TransitionReasonCode =
  | 'customer_request'
  | 'payment_timeout'
  | 'out_of_stock'
  | 'fraud_risk'
  | 'delivered_confirmed'
  | 'cod_collected_manual'
  | 'system_reconciliation'
  | 'other';

const reasonCatalog: Record<FulfillmentStatus, { code: TransitionReasonCode; label: string; requireNote?: boolean }[]> = {
  pending: [],
  packing: [],
  shipping: [],
  done: [
    { code: 'delivered_confirmed', label: 'Khách xác nhận đã nhận hàng' },
    { code: 'cod_collected_manual', label: 'Đối soát COD đã thu thủ công' },
    { code: 'system_reconciliation', label: 'Đối soát vận đơn tự động' },
    { code: 'other', label: 'Lý do khác', requireNote: true },
  ],
  canceled: [
    { code: 'customer_request', label: 'Khách yêu cầu hủy đơn' },
    { code: 'payment_timeout', label: 'Quá hạn thanh toán' },
    { code: 'out_of_stock', label: 'Hết hàng tại kho' },
    { code: 'fraud_risk', label: 'Nghi ngờ gian lận', requireNote: true },
    { code: 'other', label: 'Lý do khác', requireNote: true },
  ],
};

const reasonLabel = (code: TransitionReasonCode) => {
  const all = Object.values(reasonCatalog).flat();
  return all.find((item) => item.code === code)?.label || code;
};

const AdminOrderDetail = () => {
  const { id } = useParams();
  const order = useMemo(() => adminOrdersData.find((o) => o.code === (id || '').replace('#', '')) || null, [id]);
  const [fulfillment, setFulfillment] = useState<FulfillmentStatus>(order?.fulfillment || 'pending');
  const [timeline, setTimeline] = useState(order?.timeline || []);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order?.paymentStatus || 'unpaid');
  const [toast, setToast] = useState('');
  const [pendingTransition, setPendingTransition] = useState<FulfillmentStatus | null>(null);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [reasonCode, setReasonCode] = useState<TransitionReasonCode>('other');
  const [reasonNote, setReasonNote] = useState('');
  useEffect(() => {
    if (!order) return;
    setFulfillment(order.fulfillment);
    setTimeline(order.timeline);
    setPaymentStatus(order.paymentStatus);
    setPendingTransition(null);
    setShowTransitionModal(false);
    setReasonCode('other');
    setReasonNote('');
  }, [order]);

  if (!order) {
    return (
      <AdminLayout title="Chi tiết đơn hàng">
        <AdminStateBlock type="error" title="Không tìm thấy đơn hàng" description="Mã đơn không tồn tại hoặc đã bị xóa khỏi hệ thống." />
      </AdminLayout>
    );
  }

  const total = order.pricing.subtotal + order.pricing.shipping - order.pricing.discount;

  const statusOptions = useMemo(() => {
    const allowed = new Set<FulfillmentStatus>([fulfillment, ...fulfillmentTransitions[fulfillment]]);
    return (['pending', 'packing', 'shipping', 'done', 'canceled'] as FulfillmentStatus[]).filter(state => allowed.has(state));
  }, [fulfillment]);

  const pushToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  };

  const requestTransition = (next: FulfillmentStatus) => {
    if (next === fulfillment) return;
    const options = reasonCatalog[next];
    if (options.length > 0) {
      setReasonCode(options[0].code);
    } else {
      setReasonCode('other');
    }
    setReasonNote('');
    setPendingTransition(next);
    setShowTransitionModal(true);
  };

  const updateFulfillment = (next: FulfillmentStatus) => {
    if (next === fulfillment) return;
    const reasonOptions = reasonCatalog[next];
    const selectedReason = reasonOptions.find((item) => item.code === reasonCode);

    if ((next === 'canceled' || next === 'done') && !selectedReason) {
      pushToast('Vui lòng chọn lý do trước khi cập nhật trạng thái.');
      return;
    }

    if (selectedReason?.requireNote && !reasonNote.trim()) {
      pushToast('Lý do này yêu cầu nhập ghi chú chi tiết.');
      return;
    }

    if (!canTransitionFulfillment(fulfillment, next, paymentStatus)) {
      pushToast('Không thể chuyển trạng thái theo luồng hiện tại.');
      return;
    }
    setFulfillment(next);
    const now = new Date();
    const time = now.toLocaleString('vi-VN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    if (next === 'done' && paymentStatus === 'cod_uncollected') {
      setPaymentStatus('paid');
    }

    setTimeline(prev => [
      {
        time,
        text: `Admin cập nhật trạng thái sang ${fulfillmentLabel(next)}.`,
        tone: next === 'done' ? 'success' : next === 'canceled' ? 'error' : 'pending',
      },
      next === 'done' && paymentStatus === 'cod_uncollected'
        ? {
            time,
            text: 'Hệ thống ghi nhận COD đã thu thành công.',
            tone: 'success',
          }
        : null,
      selectedReason
        ? {
            time,
            text: `Lý do cập nhật: ${reasonLabel(selectedReason.code)}${reasonNote.trim() ? ` - ${reasonNote.trim()}` : ''}`,
            tone: 'neutral',
          }
        : null,
      ...prev,
    ].filter(Boolean) as typeof prev);
    setReasonCode('other');
    setReasonNote('');
    setPendingTransition(null);
    setShowTransitionModal(false);
    pushToast(`Đã chuyển sang ${fulfillmentLabel(next)}.`);
  };

  const exportAuditLog = () => {
    const payload = {
      orderCode: order.code,
      exportedAt: new Date().toISOString(),
      fulfillmentStatus: fulfillment,
      paymentStatus,
      timeline,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-${order.code}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    pushToast(`Đã xuất audit log cho ${order.code}.`);
  };

  const nextPaymentStatusPreview = useMemo(() => {
    if (!pendingTransition) return paymentStatus;
    if (pendingTransition === 'done' && paymentStatus === 'cod_uncollected') return 'paid' as PaymentStatus;
    return paymentStatus;
  }, [pendingTransition, paymentStatus]);

  return (
    <AdminLayout
      title={
        <div className="od-title-row">
          <button className="admin-ghost-btn" onClick={() => window.history.back()} aria-label="Quay lại">←</button>
          <span>Đơn hàng #{id || order.code}</span>
        </div>
      }
      actions={(
        <div className="admin-actions">
          <select className="admin-select" aria-label="Trạng thái đơn hàng" value={fulfillment} onChange={(e) => requestTransition(e.target.value as FulfillmentStatus)}>
            {statusOptions.map(state => (
              <option key={state} value={state}>{fulfillmentLabel(state)}</option>
            ))}
          </select>
          <button className="admin-primary-btn dark"><Printer size={16} /> In hóa đơn</button>
          <button className="admin-ghost-btn" disabled={!(fulfillment === 'canceled' && paymentStatus === 'paid')}><RotateCcw size={16} /> Hoàn tiền</button>
          <button className="admin-ghost-btn danger" disabled={!fulfillmentTransitions[fulfillment].includes('canceled')} onClick={() => requestTransition('canceled')}><XCircle size={16} /> Hủy đơn</button>
        </div>
      )}
    >
      <div className="order-detail-grid">
        <div className="od-left">
          <section className="od-section">
            <div className="od-section-head">
              <h2>Order Items</h2>
            </div>
            <div className="od-items">
              {order.items.map(item => (
                <div key={item.id} className="od-item">
                  <img src={item.image} alt={item.name} />
                  <div className="od-item-info">
                    <p className="od-item-name">{item.name}</p>
                    <p className="od-item-variant"><strong>{item.color}</strong> · <strong>Size {item.size}</strong></p>
                    <p className="od-item-price">{item.qty} x {formatVND(item.price)}</p>
                  </div>
                  <div className="od-item-total">{formatVND(item.qty * item.price)}</div>
                </div>
              ))}
            </div>
            <div className="od-summary">
              <div className="od-summary-row"><span>Tạm tính</span><strong>{formatVND(order.pricing.subtotal)}</strong></div>
              <div className="od-summary-row"><span>Phí vận chuyển</span><strong>{formatVND(order.pricing.shipping)}</strong></div>
              <div className="od-summary-row"><span>Giảm giá {order.pricing.voucher && `(${order.pricing.voucher})`}</span><strong>-{formatVND(order.pricing.discount)}</strong></div>
              <div className="od-summary-row od-total"><span>Tổng thanh toán</span><strong>{formatVND(total)}</strong></div>
            </div>
          </section>

          <section className="od-section">
            <div className="od-section-head">
              <h2>Payment Details</h2>
            </div>
            <div className="od-card">
              <div className="od-card-row"><span className="od-label">Payment Method</span><strong>{order.paymentMethod}</strong></div>
               <div className="od-card-row"><span className="od-label">Thanh toán</span><span className={`admin-pill ${paymentStatus === 'paid' ? 'success' : paymentStatus === 'refund_pending' ? 'error' : 'pending'}`}>{paymentLabel(paymentStatus)}</span></div>
               <div className="od-card-row"><span className="od-label">Vận chuyển</span><span className={`admin-pill ${fulfillment === 'done' ? 'success' : fulfillment === 'canceled' ? 'error' : 'pending'}`}><Truck size={14} /> {shipLabel(fulfillment)}</span></div>
              <div className="od-card-row tracking-row">
                <span className="od-label">Tracking</span>
                <div className="tracking-value">
                  <strong>{order.tracking}</strong>
                  <button className="admin-icon-btn" aria-label="Copy tracking" onClick={() => navigator.clipboard?.writeText(order.tracking)}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="od-right">
          <section className="od-section">
            <div className="od-section-head">
              <h2>Customer & Shipping</h2>
            </div>
            <div className="od-card">
              <div className="od-card-row"><span className="od-label">Customer</span><strong>{order.customerInfo.name}</strong></div>
              <div className="od-card-row"><span className="od-label">Phone</span><strong>{order.customerInfo.phone}</strong></div>
              <div className="od-card-row"><span className="od-label">Email</span><span>{order.customerInfo.email}</span></div>
              <div className="od-card-row"><span className="od-label">Address</span><span>{order.address}</span></div>
              <div className="od-card-row"><span className="od-label">Shipper</span><span>{order.shipMethod}</span></div>
              <div className="od-note">Guest note: {order.note}</div>
            </div>
          </section>

          <section className="od-section">
            <div className="od-section-head">
              <h2>Order Timeline</h2>
              <button className="admin-ghost-btn" onClick={exportAuditLog}><Download size={14} /> Xuất audit log</button>
            </div>
            <div className="od-timeline">
              {timeline.map((log, idx) => (
                <div key={idx} className="od-timeline-item">
                  <div className={`od-timeline-dot ${log.tone || 'neutral'}`} />
                  <div>
                    <p className="od-timeline-time">{log.time}</p>
                    <p className="od-timeline-text">
                      <User size={14} /> {log.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {showTransitionModal && pendingTransition && (
        <>
          <div className="drawer-overlay" onClick={() => { setShowTransitionModal(false); setPendingTransition(null); }} />
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-label="Xác nhận chuyển trạng thái">
            <h3>Xác nhận chuyển trạng thái đơn hàng</h3>
            <p>Bạn đang chuyển từ <strong>{fulfillmentLabel(fulfillment)}</strong> sang <strong>{fulfillmentLabel(pendingTransition)}</strong>.</p>
            <div className="confirm-impact-grid">
              <div>
                <span className="admin-muted small">Trạng thái thanh toán hiện tại</span>
                <p className="admin-bold">{paymentLabel(paymentStatus)}</p>
              </div>
              <div>
                <span className="admin-muted small">Sau khi chuyển trạng thái</span>
                <p className="admin-bold">{paymentLabel(nextPaymentStatusPreview)}</p>
              </div>
            </div>

            {(pendingTransition === 'canceled' || pendingTransition === 'done') && (
              <div className="confirm-reason-block">
                <label className="form-field">
                  <span>Lý do chuyển trạng thái</span>
                  <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value as TransitionReasonCode)}>
                    {reasonCatalog[pendingTransition].map((item) => (
                      <option key={item.code} value={item.code}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Ghi chú nội bộ</span>
                  <textarea rows={3} value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} placeholder="Mô tả thêm nếu cần (log nội bộ)" />
                </label>
              </div>
            )}

            {(() => {
              const selectedReason = reasonCatalog[pendingTransition].find((item) => item.code === reasonCode);
              const shouldWarn = (pendingTransition === 'canceled' || pendingTransition === 'done') && (!selectedReason || (selectedReason.requireNote && !reasonNote.trim()));
              return shouldWarn ? <p className="confirm-warning">Cần chọn lý do hợp lệ và nhập ghi chú bắt buộc trước khi xác nhận thao tác này.</p> : null;
            })()}
            <div className="confirm-modal-actions">
              <button className="admin-ghost-btn" onClick={() => { setShowTransitionModal(false); setPendingTransition(null); }}>Hủy</button>
              <button
                className="admin-primary-btn"
                disabled={(() => {
                  if (pendingTransition !== 'canceled' && pendingTransition !== 'done') return false;
                  const selectedReason = reasonCatalog[pendingTransition].find((item) => item.code === reasonCode);
                  if (!selectedReason) return true;
                  if (selectedReason.requireNote && !reasonNote.trim()) return true;
                  return false;
                })()}
                onClick={() => updateFulfillment(pendingTransition)}
              >
                Xác nhận cập nhật
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast success">{toast}</div>}
    </AdminLayout>
  );
};

export default AdminOrderDetail;
