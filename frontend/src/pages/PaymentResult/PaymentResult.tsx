import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock3, ChevronRight, CreditCard, Loader2 } from 'lucide-react';
import './PaymentResult.css';
import { formatPrice } from '../../utils/formatters';
import { useCart } from '../../contexts/CartContext';
import { clearSelectedCartIdsForCheckout } from '../../services/checkoutSelectionStore';
import { orderService, type VnpayReturnVerifyResponse } from '../../services/orderService';
import { apiRequest, hasBackendJwt } from '../../services/apiClient';
import {
  clearPendingVnpayCheckout,
  getPendingVnpayCheckout,
  setPendingVnpayCheckout,
} from '../../services/vnpayCheckoutStore';

type Status = 'success' | 'failed' | 'pending';

const getStatusFromQuery = (search: string): Status => {
  const params = new URLSearchParams(search);
  const value = (params.get('status') || '').toLowerCase();
  if (value === 'success') return 'success';
  if (value === 'failed' || value === 'fail') return 'failed';
  return 'pending';
};

const PaymentResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const { items, clearCart, removeFromCart } = useCart();

  const [verifyResult, setVerifyResult] = useState<VnpayReturnVerifyResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Preload OrderSuccess chunk so redirect feels instant.
    void import('../OrderSuccess/OrderSuccess');
  }, []);

  const hasVnpQuery = useMemo(
    () => Array.from(params.keys()).some((key) => key.startsWith('vnp_')),
    [params],
  );

  const clearCartByMarker = useCallback((cartIds: string[]) => {
    const normalized = Array.from(new Set(cartIds.map((value) => value.trim()).filter(Boolean)));
    if (normalized.length === 0) {
      return;
    }
    const selectedSet = new Set(normalized);
    const removable = items.filter((item) => selectedSet.has(item.cartId));
    if (removable.length === 0) {
      return;
    }

    if (removable.length === items.length) {
      clearCart();
    } else {
      removable.forEach((item) => removeFromCart(item.cartId));
    }
  }, [clearCart, items, removeFromCart]);

  useEffect(() => {
    let cancelled = false;
    if (!hasVnpQuery) {
      setVerifyResult(null);
      setIsVerifying(false);
      return () => {
        cancelled = true;
      };
    }

    setIsVerifying(true);
    orderService.verifyVnpayReturn(location.search)
      .then((result) => {
        if (!cancelled) {
          setVerifyResult(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVerifyResult({
            status: 'failed',
            orderPaid: false,
            message: 'Không thể xác minh kết quả thanh toán VNPAY',
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsVerifying(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasVnpQuery, location.search]);

  useEffect(() => {
    if (!verifyResult || verifyResult.status !== 'success' || !verifyResult.orderPaid) {
      return;
    }
    const pending = getPendingVnpayCheckout();
    if (!pending) {
      return;
    }
    if (verifyResult.orderCode && pending.orderCode !== verifyResult.orderCode) {
      return;
    }

    clearCartByMarker(pending.cartIds);
    clearPendingVnpayCheckout();
    clearSelectedCartIdsForCheckout();
  }, [clearCartByMarker, verifyResult]);

  useEffect(() => {
    if (!verifyResult || hasRedirectedRef.current) {
      return;
    }
    const resolvedOrderCode = String(verifyResult.orderCode || '').trim();
    if (!resolvedOrderCode) {
      return;
    }

    const gatewaySuccess = verifyResult.responseCode === '00' && verifyResult.transactionStatus === '00';
    const canRedirectToOrderSuccess =
      (verifyResult.status === 'success' && verifyResult.orderPaid) ||
      (verifyResult.status === 'pending' && gatewaySuccess);

    if (!canRedirectToOrderSuccess) {
      return;
    }

    hasRedirectedRef.current = true;
    navigate(`/order-success?id=${encodeURIComponent(resolvedOrderCode)}`, { replace: true });
  }, [navigate, verifyResult]);

  useEffect(() => {
    if (!hasVnpQuery || !verifyResult || verifyResult.status !== 'pending' || !hasBackendJwt()) {
      return;
    }

    const resolvedOrderCode = String(verifyResult.orderCode || '').trim();
    if (!resolvedOrderCode) {
      return;
    }

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 15;
    const intervalMs = 2000;

    const pollPaidStatus = async () => {
      attempt += 1;
      try {
        const order = await apiRequest<{ paymentStatus?: string }>(
          `/api/orders/code/${encodeURIComponent(resolvedOrderCode)}`,
          {},
          { auth: true },
        );
        if (cancelled) {
          return;
        }
        if ((order.paymentStatus || '').toUpperCase() === 'PAID') {
          setVerifyResult((prev) => prev
            ? { ...prev, status: 'success', orderPaid: true, message: 'Thanh toán thành công' }
            : prev);
          return;
        }
      } catch {
        // keep polling until max attempts
      }

      if (!cancelled && attempt < maxAttempts) {
        window.setTimeout(() => {
          void pollPaidStatus();
        }, intervalMs);
      }
    };

    void pollPaidStatus();
    return () => {
      cancelled = true;
    };
  }, [hasVnpQuery, verifyResult]);

  const status: Status = hasVnpQuery
    ? (isVerifying ? 'pending' : (verifyResult?.status || 'failed'))
    : getStatusFromQuery(location.search);

  const orderCode = verifyResult?.orderCode || params.get('orderCode') || params.get('order_id') || '';
  const amountLabel = (() => {
    if (typeof verifyResult?.amount === 'number' && Number.isFinite(verifyResult.amount)) {
      return formatPrice(verifyResult.amount);
    }
    const fallback = params.get('amount') || params.get('total') || '';
    return fallback || 'Chưa có';
  })();
  const method = hasVnpQuery ? 'VNPay' : (params.get('method') || 'Cổng thanh toán');
  const missingInfo = !orderCode;

  const statusMeta: Record<Status, { label: string; desc: string; icon: React.ReactNode; tone: string }> = {
    success: {
      label: 'Thanh toán thành công',
      desc: 'Hệ thống đã ghi nhận thanh toán. Đơn hàng sẽ được xử lý sớm.',
      icon: <CheckCircle2 className="pr-icon success" size={46} />,
      tone: 'success',
    },
    failed: {
      label: 'Thanh toán thất bại',
      desc: 'Giao dịch chưa hoàn tất hoặc bị từ chối. Bạn có thể thử lại.',
      icon: <XCircle className="pr-icon error" size={46} />,
      tone: 'error',
    },
    pending: {
      label: 'Đang chờ xác nhận',
      desc: 'Hệ thống đang đợi xác nhận thanh toán từ VNPay.',
      icon: <Clock3 className="pr-icon pending" size={46} />,
      tone: 'pending',
    },
  };

  const meta = statusMeta[status];

  const handleRetryPayment = async () => {
    if (!orderCode || isRetrying) {
      return;
    }
    setIsRetrying(true);
    setRetryError('');
    try {
      const payload = await orderService.createVnpayPayUrl(orderCode);
      const pending = getPendingVnpayCheckout();
      setPendingVnpayCheckout({
        orderCode: payload.orderCode || orderCode,
        cartIds: pending?.cartIds || [],
        createdAt: Date.now(),
      });
      window.location.href = payload.paymentUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tạo lại link thanh toán';
      setRetryError(message);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="payment-result-page">
      <div className="container">
        <div className="pr-card">
          <div className="pr-header">
            {meta.icon}
            <div>
              <p className="pr-eyebrow">Kết quả thanh toán</p>
              <h1 className={`pr-title ${meta.tone}`}>{meta.label}</h1>
              <p className="pr-desc">{meta.desc}</p>
            </div>
          </div>

          <div className="pr-summary">
            <div className="pr-row">
              <span>Mã đơn hàng</span>
              <strong>{orderCode || 'Chưa có'}</strong>
            </div>
            <div className="pr-row">
              <span>Số tiền</span>
              <strong>{amountLabel}</strong>
            </div>
            <div className="pr-row">
              <span>Phương thức</span>
              <strong className="pr-method"><CreditCard size={16} /> {method}</strong>
            </div>
            <div className="pr-row">
              <span>Trạng thái</span>
              <span className={`pr-pill ${meta.tone}`}>{meta.label}</span>
            </div>
            {verifyResult?.message && (
              <div className="pr-row pr-warning">
                <span>Thông điệp</span>
                <span>{verifyResult.message}</span>
              </div>
            )}
            {missingInfo && (
              <div className="pr-row pr-warning">
                <span>Thiếu thông tin</span>
                <span>Không tìm thấy mã đơn hàng trong kết quả trả về.</span>
              </div>
            )}
          </div>

          <div className="pr-actions">
            {status === 'success' ? (
              <>
                <Link to={orderCode ? `/order-tracking?code=${orderCode}` : '/order-tracking'} className="pr-btn primary">Theo dõi đơn</Link>
                <Link to="/" className="pr-btn ghost">Về trang chủ</Link>
              </>
            ) : status === 'failed' ? (
              <>
                <button type="button" className="pr-btn primary" onClick={handleRetryPayment} disabled={isRetrying || !orderCode}>
                  {isRetrying ? <Loader2 size={16} className="spinner" /> : 'Thử thanh toán lại'}
                </button>
                <Link to="/checkout" className="pr-btn ghost">Quay lại checkout</Link>
              </>
            ) : (
              <>
                <Link to={orderCode ? `/order-tracking?code=${orderCode}` : '/order-tracking'} className="pr-btn primary">Kiểm tra trạng thái</Link>
                <Link to="/" className="pr-btn ghost">Trang chủ</Link>
              </>
            )}
            <Link to="/faq" className="pr-btn ghost">Xem FAQ thanh toán</Link>
          </div>
          {retryError && (
            <div className="pr-help">
              <div>
                <h3>Không thể retry thanh toán</h3>
                <p>{retryError}</p>
              </div>
            </div>
          )}
        </div>

        <div className="pr-help">
          <div>
            <h3>Cần hỗ trợ thêm?</h3>
            <p>Nếu cần, hãy gửi mã đơn hàng cho CSKH để được hỗ trợ nhanh.</p>
          </div>
          <Link to="/faq" className="pr-link">Xem FAQ <ChevronRight size={16} /></Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
