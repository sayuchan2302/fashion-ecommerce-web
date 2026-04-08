import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Home, Truck, Gift } from 'lucide-react';
import ProductSection from '../../components/ProductSection/ProductSection';
import { mensFashion } from '../../mocks/products';
import { orderService } from '../../services/orderService';
import type { Order } from '../../types/order';
import './OrderSuccess.css';

const getPaymentMethodLabel = (paymentMethod?: string) => {
  switch ((paymentMethod || '').toUpperCase()) {
    case 'VNPAY':
      return 'Thanh toán qua VNPay';
    case 'MOMO':
      return 'Thanh toán qua MoMo';
    case 'ZALOPAY':
      return 'Thanh toán qua ZaloPay';
    case 'BANK_TRANSFER':
      return 'Chuyển khoản ngân hàng';
    case 'COD':
      return 'Thanh toán khi nhận hàng';
    default:
      return 'Thanh toán khi nhận hàng';
  }
};

const getOrderStatusLabel = (status?: Order['status']) => {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'processing':
      return 'Đang xử lý';
    case 'shipping':
      return 'Đang giao';
    case 'delivered':
      return 'Đã giao';
    case 'cancelled':
      return 'Đã hủy';
    case 'refunded':
      return 'Đã hoàn tiền';
    default:
      return 'Đang xử lý';
  }
};

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const [fallbackOrderId] = useState(() => Math.floor(Math.random() * 1000000).toString());
  const orderId = searchParams.get('id') || fallbackOrderId;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resolvedOrder, setResolvedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ['#1e3a8a', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
    const pieces: {
      x: number;
      y: number;
      r: number;
      d: number;
      color: string;
      tilt: number;
      tiltAngle: number;
      tiltAngleInc: number;
    }[] = [];

    for (let i = 0; i < 120; i += 1) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * 80 + 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngle: 0,
        tiltAngleInc: Math.random() * 0.07 + 0.05,
      });
    }

    let angle = 0;
    let rafId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;

      pieces.forEach((piece) => {
        piece.tiltAngle += piece.tiltAngleInc;
        piece.y += (Math.cos(angle + piece.d) + 1.5) * 1.2;
        piece.x += Math.sin(angle) * 1.5;
        piece.tilt = Math.sin(piece.tiltAngle) * 12;

        ctx.beginPath();
        ctx.lineWidth = piece.r / 2;
        ctx.strokeStyle = piece.color;
        ctx.moveTo(piece.x + piece.tilt + piece.r / 4, piece.y);
        ctx.lineTo(piece.x + piece.tilt, piece.y + piece.tilt + piece.r / 4);
        ctx.stroke();
      });

      pieces.forEach((piece) => {
        if (piece.y > canvas.height) {
          piece.y = -10;
          piece.x = Math.random() * canvas.width;
        }
      });

      rafId = requestAnimationFrame(draw);
    };

    draw();

    const stopTimer = window.setTimeout(() => {
      cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 4000);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(stopTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const normalizedOrderId = String(orderId || '').trim();
    if (!normalizedOrderId) {
      return () => {
        cancelled = true;
      };
    }

    orderService.getByIdFromBackend(normalizedOrderId)
      .then((order) => {
        if (!cancelled && order) {
          setResolvedOrder(order);
        }
      })
      .catch(() => {
        // Keep fallback UI when order details cannot be loaded.
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + 3);
  const formattedDate = estimatedDate.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

  const paymentMethodLabel = getPaymentMethodLabel(resolvedOrder?.paymentMethod);
  const statusLabel = getOrderStatusLabel(resolvedOrder?.status);

  return (
    <div className="order-success-page">
      <canvas ref={canvasRef} className="confetti-canvas" />

      <div className="os-wrapper">
        <div className="order-success-card">
          <div className="success-check-wrapper">
            <div className="success-check-circle">
              <CheckCircle size={48} />
            </div>
          </div>

          <h1 className="os-title">Đặt hàng thành công! 🎉</h1>
          <p className="os-subtitle">Cảm ơn bạn đã tin tưởng mua sắm tại Coolmate</p>

          <div className="os-order-info">
            <div className="os-info-row">
              <span className="os-label">Mã đơn hàng</span>
              <span className="os-value os-order-id">#{orderId}</span>
            </div>
            <div className="os-info-row">
              <span className="os-label">Trạng thái</span>
              <span className="os-value os-status">
                <Package size={14} /> {statusLabel}
              </span>
            </div>
            <div className="os-info-row">
              <span className="os-label">Phương thức thanh toán</span>
              <span className="os-value">{paymentMethodLabel}</span>
            </div>
          </div>

          <div className="os-delivery-estimate">
            <Truck size={18} className="os-delivery-icon" />
            <div>
              <p className="os-delivery-label">Dự kiến giao hàng</p>
              <p className="os-delivery-date">{formattedDate}</p>
            </div>
          </div>

          <p className="os-note">
            Bạn sẽ nhận được email xác nhận trong vài phút tới.
            Theo dõi đơn hàng trong phần <strong>Lịch sử đơn hàng</strong>.
          </p>

          <div className="os-actions">
            <Link to={`/profile/orders/${encodeURIComponent(orderId)}`} className="os-btn os-btn-outline">
              <Package size={16} />
              Xem đơn hàng
            </Link>
            <Link to={`/payment-result?status=success&orderCode=${orderId}`} className="os-btn os-btn-outline">
              <Home size={16} />
              Xem thanh toán
            </Link>
            <Link to="/" className="os-btn os-btn-primary">
              <Home size={16} />
              Tiếp tục mua sắm
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="os-loyalty-hint">
            <Gift size={16} />
            <span>Bạn đã tích lũy thêm <strong>điểm CoolClub</strong> từ đơn hàng này!</span>
          </div>
        </div>

        <div className="os-cross-sell">
          <ProductSection title="CÓ THỂ BẠN CŨNG THÍCH" products={mensFashion.slice(0, 4)} />
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
