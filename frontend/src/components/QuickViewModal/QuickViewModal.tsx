import { useState } from 'react';
import { X, Minus, Plus, ShoppingCart, Check, Heart, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCartAnimation } from '../../context/CartAnimationContext';
import { productService } from '../../services/productService';
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
}

interface QuickViewModalProps {
  product: QuickViewProduct;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL'];

const QuickViewModal = ({ product, isOpen, onClose }: QuickViewModalProps) => {
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { triggerAnimation } = useCartAnimation();
  const [selectedSize, setSelectedSize] = useState(DEFAULT_SIZES[1]); // Default M
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const productRouteKey = String(product.id);
  const isWished = isInWishlist(productRouteKey);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const availableSizes = product.sizes ?? DEFAULT_SIZES;
  const selectedColorValue = product.colors?.[selectedColorIdx] ?? 'Mặc định';

  const handleAddToCart = async () => {
    const purchaseReference = product.backendId
      ? { backendProductId: product.backendId, backendVariantId: undefined }
      : await productService.resolvePurchaseReference(productRouteKey, selectedColorValue, selectedSize);

    addToCart({
      id: productRouteKey,
      backendProductId: purchaseReference.backendProductId,
      backendVariantId: purchaseReference.backendVariantId,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      color: selectedColorValue,
      size: selectedSize,
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
        {/* Close Button */}
        <button className="qv-close-btn" onClick={onClose} aria-label="Đóng">
          <X size={24} />
        </button>

        <div className="qv-content">
          {/* Left: Image */}
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

          {/* Right: Info & Actions */}
          <div className="qv-info-col">
            <h2 className="qv-product-name">{product.name}</h2>

            {/* Prices */}
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

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="qv-section">
                <label className="qv-label">Màu sắc</label>
                <div className="qv-color-swatches">
                  {product.colors.map((color, idx) => (
                    <button
                      key={idx}
                      className={`qv-color-swatch ${selectedColorIdx === idx ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColorIdx(idx)}
                      aria-label={`Màu ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
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

            {/* Quantity */}
            <div className="qv-section">
              <label className="qv-label">Số lượng</label>
              <div className="qv-quantity">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Giảm số lượng"
                >
                  <Minus size={16} />
                </button>
                <span className="qv-qty-value">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                  aria-label="Tăng số lượng"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="qv-actions">
              <button
                className={`qv-add-cart-btn ${added ? 'added' : ''}`}
                onClick={handleAddToCart}
                disabled={added}
              >
                {added ? (
                  <><Check size={20} /> Đã thêm vào giỏ</>
                ) : (
                  <><ShoppingCart size={20} /> Thêm vào giỏ</>
                )}
              </button>
              <button
                className={`qv-wishlist-btn ${isWished ? 'wished' : ''}`}
                onClick={handleToggleWishlist}
                title={isWished ? 'Bỏ yêu thích' : 'Yêu thích'}
                aria-label={isWished ? 'Bỏ yêu thích' : 'Yêu thích'}
              >
                <Heart size={22} fill={isWished ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* View Detail Link */}
            <Link to={`/product/${productRouteKey}`} className="qv-view-detail" onClick={onClose}>
              <ExternalLink size={16} /> Xem chi tiết sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
