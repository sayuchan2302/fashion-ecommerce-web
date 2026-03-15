import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useCartAnimation } from '../../context/CartAnimationContext';
import './ProductCard.css';

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  colors?: string[];
  sizes?: string[];
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

const ProductCard = ({ id, name, price, originalPrice, image, badge, colors, sizes }: ProductCardProps) => {
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;
  const { addToCart } = useCart();
  const { triggerAnimation } = useCartAnimation();
  const [addedSize, setAddedSize] = useState<string | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const availableSizes = sizes ?? DEFAULT_SIZES;
  const selectedColorValue = colors?.[selectedColorIdx] ?? '';

  const handleSizeClick = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();

    addToCart({
      id,
      name,
      price,
      originalPrice,
      image,
      color: selectedColorValue || 'Mặc định',
      size,
    });

    setAddedSize(size);
    triggerAnimation(e, image);
    
    setTimeout(() => setAddedSize(null), 1500);
  };

  const handleColorClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColorIdx(idx);
  };

  return (
    <div className="product-card">
      <div className="product-image-container">
        <Link to={`/product/${id}`}>
          <img src={image} alt={name} className="product-image" loading="lazy" />
          {badge && <span className={`product-badge ${badge === 'SALE' ? 'badge-sale' : ''}`}>{badge}</span>}
          {!badge && discount > 0 && (
            <span className="product-badge badge-sale">-{discount}%</span>
          )}
        </Link>

        {/* Hover Quick-Add Panel */}
        <div className="quick-add-overlay">
          <div className="quick-add-panel">
            <p className="quick-add-label">
              Thêm nhanh vào giỏ hàng <Plus size={14} strokeWidth={2.5} />
            </p>
            <div className="quick-add-sizes">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  className={`quick-size-btn ${addedSize === size ? 'added' : ''}`}
                  onClick={(e) => handleSizeClick(e, size)}
                  title={`Thêm size ${size}`}
                >
                  {addedSize === size ? '✓' : size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="product-info">
        {/* Color swatches - clickable with ring on selected */}
        {colors && colors.length > 0 && (
          <div className="product-colors">
            {colors.map((color, idx) => (
              <button
                key={idx}
                className={`color-swatch-btn ${selectedColorIdx === idx ? 'selected' : ''}`}
                style={{ '--swatch-color': color } as React.CSSProperties}
                onClick={(e) => handleColorClick(e, idx)}
                aria-label={`Chọn màu ${idx + 1}`}
              >
                <span className="swatch-inner" style={{ backgroundColor: color }}></span>
              </button>
            ))}
          </div>
        )}
        <Link to={`/product/${id}`} className="product-name-link">
          <h3 className="product-name">{name}</h3>
        </Link>
        <div className="product-prices">
          <span className="current-price">{price.toLocaleString('vi-VN')}đ</span>
          {originalPrice && <span className="original-price">{originalPrice.toLocaleString('vi-VN')}đ</span>}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
