import { useState } from 'react';
import { X, Minus, Plus, ShoppingCart, Check, Heart, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useToast } from '../../contexts/ToastContext';
import { useCartAnimation } from '../../context/CartAnimationContext';
import { productService } from '../../services/productService';
import { resolveColorSwatch } from '../../utils/colorSwatch';
import './QuickViewModal.css';

interface QuickViewProduct {
  id: number | string;
  backendId?: string;
  sku?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  colors?: string[];
  sizes?: string[];
  variants?: Array<{
    color: string;
    colorHex?: string;
    size: string;
    backendId?: string;
  }>;
  storeId?: string;
  storeName?: string;
  isOfficialStore?: boolean;
}

interface QuickViewModalProps {
  product: QuickViewProduct;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL'];

const QuickViewModal = ({ product, isOpen, onClose }: QuickViewModalProps) => {
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { triggerAnimation } = useCartAnimation();
  const [selectedSize, setSelectedSize] = useState(() => (
    product.variants?.[0]?.size || product.sizes?.[0] || DEFAULT_SIZES[1]
  ));
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const productRouteKey = String(product.id);
  const isWished = isInWishlist(productRouteKey);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const variantSizes = Array.from(new Set((product.variants || []).map((variant) => variant.size).filter(Boolean)));
  const availableSizes = variantSizes.length > 0 ? variantSizes : (product.sizes ?? DEFAULT_SIZES);
  const selectedColorValue = product.colors?.[selectedColorIdx] ?? '';
  const colorHexByName = new Map(
    (product.variants || [])
      .map((variant) => [String(variant.color || '').trim(), String(variant.colorHex || '').trim()] as const)
      .filter(([color, hex]) => Boolean(color && hex)),
  );

  const handleAddToCart = async () => {
    const localVariantId = product.variants?.find((variant) => (
      variant.color.toLowerCase() === selectedColorValue.toLowerCase()
      && variant.size.toLowerCase() === selectedSize.toLowerCase()
    ))?.backendId;
    const purchaseReference = localVariantId
      ? { backendProductId: product.backendId, backendVariantId: localVariantId, activeVariantCount: product.variants?.length || 0 }
      : await productService.resolvePurchaseReference(
        String(product.backendId || productRouteKey),
        selectedColorValue || undefined,
        selectedSize || undefined,
        { forceRefresh: true, strictPublic: Boolean(product.backendId) },
      );

    if (!purchaseReference.backendProductId) {
      addToast('Sản phẩm chưa đồng bộ backend, vui lòng thử lại.', 'error');
      return;
    }
    if (!purchaseReference.backendVariantId && (purchaseReference.activeVariantCount || 0) > 1) {
      addToast('Vui lòng chọn đúng màu/size trước khi thêm vào giỏ.', 'error');
      return;
    }

    addToCart({
      id: productRouteKey,
      backendProductId: purchaseReference.backendProductId,
      backendVariantId: purchaseReference.backendVariantId,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      color: selectedColorValue || 'Default',
      size: selectedSize,
      storeId: product.storeId,
      storeName: product.storeName,
      isOfficialStore: product.isOfficialStore,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    if (isWished) {
      removeFromWishlist(productRouteKey);
    } else {
      const imageEl = document.querySelector('.qv-image') as HTMLImageElement | null;
      triggerAnimation({
        imgSrc: product.image,
        imageRect: imageEl?.getBoundingClientRect() || null,
        fallbackPoint: { x: e.clientX, y: e.clientY },
        target: 'wishlist',
      });
      addToWishlist({
        id: productRouteKey,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        storeId: product.storeId,
        storeName: product.storeName,
        isOfficialStore: product.isOfficialStore,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="qv-overlay" onClick={onClose}>
      <div
        className="qv-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Xem nhanh ${product.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="qv-close-btn" onClick={onClose} aria-label="Dong">
          <X size={24} />
        </button>

        <div className="qv-content">
          <div className="qv-image-col">
            <div className="qv-image-wrapper">
              <img
                src={product.image}
                alt={product.name}
                className="qv-image"
                width={672}
                height={990}
              />
              {discount > 0 && (
                <span className="qv-badge">-{discount}%</span>
              )}
            </div>
          </div>

          <div className="qv-info-col">
            <h2 className="qv-product-name">{product.name}</h2>

            <div className="qv-prices">
              <span className="qv-current-price">
                {product.price.toLocaleString('vi-VN')}đ
              </span>
              {product.originalPrice && (
                <span className="qv-original-price">
                  {product.originalPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
            </div>

            {product.colors && product.colors.length > 0 && (
              <div className="qv-section">
                <label className="qv-label">Màu sắc</label>
                <div className="qv-color-swatches">
                  {product.colors.map((color, idx) => (
                    <button
                      key={idx}
                      className={`qv-color-swatch ${selectedColorIdx === idx ? 'selected' : ''}`}
                      style={{ backgroundColor: resolveColorSwatch(colorHexByName.get(color) || color) }}
                      onClick={() => setSelectedColorIdx(idx)}
                      aria-label={`Màu ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="qv-section">
              <label className="qv-label">Kích thước</label>
              <div className="qv-sizes">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    className={`qv-size-btn ${selectedSize === size ? 'selected' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="qv-section">
              <label className="qv-label">Số lượng</label>
              <div className="qv-quantity">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Giam so luong"
                >
                  <Minus size={16} />
                </button>
                <span className="qv-qty-value">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                  aria-label="Tang so luong"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="qv-actions">
              <button
                className={`qv-add-cart-btn ${added ? 'added' : ''}`}
                onClick={handleAddToCart}
                disabled={added}
              >
                {added ? (
                  <><Check size={20} /> Da them vao gio</>
                ) : (
                  <><ShoppingCart size={20} /> Them vao gio</>
                )}
              </button>
              <button
                className={`qv-wishlist-btn ${isWished ? 'wished' : ''}`}
                onClick={handleToggleWishlist}
                title={isWished ? 'Bo yeu thich' : 'Yeu thich'}
                aria-label={isWished ? 'Bo yeu thich' : 'Yeu thich'}
              >
                <Heart size={22} fill={isWished ? 'currentColor' : 'none'} />
              </button>
            </div>

            <Link to={`/product/${productRouteKey}`} className="qv-view-detail" onClick={onClose}>
              <ExternalLink size={16} /> Xem chi tiet san pham
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
