import { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { resolveColorSwatch } from '../../utils/colorSwatch';
import './ProductInfo.css';

interface ProductInfoProps {
  product: {
    name: string;
    price: number;
    originalPrice?: number;
    sold?: number;
    colors?: string[];
    variants?: { size: string; color: string; colorHex?: string; price: number; stock: number }[];
  };
  averageRating?: number | null;
  reviewCount?: number;
  onVariantChange?: (color: string, size: string) => void;
}

const ONE_SIZE_TOKENS = new Set(['free', 'f', 'one size', 'onesize', 'os']);

const isOneSizeToken = (size: string) => ONE_SIZE_TOKENS.has(size.trim().toLowerCase());

const ProductInfo = ({ product, averageRating = null, reviewCount = 0, onVariantChange }: ProductInfoProps) => {
  const colorOptions = useMemo(
    () => product.colors || Array.from(new Set(product.variants?.map((variant) => variant.color) || [])),
    [product.colors, product.variants],
  );

  const colorHexByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const variant of product.variants || []) {
      const color = String(variant.color || '').trim();
      const hex = String(variant.colorHex || '').trim();
      if (!color || !hex || map.has(color)) {
        continue;
      }
      map.set(color, hex);
    }
    return map;
  }, [product.variants]);

  const sizeOptions = useMemo(
    () => Array.from(new Set((product.variants?.map((variant) => String(variant.size || '').trim()) || []).filter(Boolean))),
    [product.variants],
  );

  const isOneSizeOnly = sizeOptions.length === 1 && isOneSizeToken(sizeOptions[0]);
  const showSizeSelector = sizeOptions.length > 0 && !isOneSizeOnly;

  const [selectedColor, setSelectedColor] = useState(colorOptions[0] || '');
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || '');

  const activeVariant = useMemo(
    () => product.variants?.find((variant) => variant.color === selectedColor && variant.size === selectedSize),
    [product.variants, selectedColor, selectedSize],
  );

  const price = activeVariant?.price ?? product.price;
  const discount = product.originalPrice ? Math.round((1 - price / product.originalPrice) * 100) : 0;

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onVariantChange?.(color, selectedSize);
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    onVariantChange?.(selectedColor, size);
  };

  return (
    <div className="product-info-container">
      <h1 className="pdp-title">{product.name}</h1>

      <div className="pdp-meta">
        {reviewCount > 0 ? (
          <div className="pdp-rating">
            <span className="rating-score">{averageRating?.toFixed(1) || '0.0'}</span>
            <Star size={14} fill="#FFD700" color="#FFD700" />
            <span className="rating-count">({reviewCount} đánh giá)</span>
          </div>
        ) : (
          <div className="pdp-rating">
            <span className="rating-count">Chưa có đánh giá</span>
          </div>
        )}

        {typeof product.sold === 'number' ? (
          <>
            <span className="separator">|</span>
            <div className="pdp-sold">Đã bán {product.sold > 1000 ? `${(product.sold / 1000).toFixed(1)}k` : product.sold}</div>
          </>
        ) : null}
      </div>

      <div className="pdp-price-box">
        <span className="current-price">{price.toLocaleString('vi-VN')}đ</span>
        {product.originalPrice ? (
          <>
            <span className="original-price">{product.originalPrice.toLocaleString('vi-VN')}đ</span>
            <span className="discount-badge">-{discount}%</span>
          </>
        ) : null}
      </div>

      <div className="pdp-variant-group">
        <div className="variant-header">
          <span className="variant-label">Màu sắc: <strong>{selectedColor}</strong></span>
        </div>
        <div className="color-options">
          {colorOptions.map((color) => (
            <button
              key={color}
              className={`color-btn ${selectedColor === color ? 'selected' : ''}`}
              onClick={() => handleColorChange(color)}
              title={color}
              aria-label={`Select color ${color}`}
            >
              <span
                className="color-swatch-inner"
                style={{ backgroundColor: resolveColorSwatch(colorHexByName.get(color) || color) }}
              ></span>
            </button>
          ))}
        </div>
      </div>

      {showSizeSelector ? (
        <div className="pdp-variant-group">
          <div className="variant-header">
            <span className="variant-label">Kích cỡ: <strong>{selectedSize}</strong></span>
            <button className="size-guide-link">Bảng kích cỡ</button>
          </div>
          <div className="size-options">
            {sizeOptions.map((size) => (
              <button
                key={size}
                className={`size-btn ${selectedSize === size ? 'selected' : ''}`}
                onClick={() => handleSizeChange(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProductInfo;
