import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Heart, Eye, Store, ShoppingBag } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useCartAnimation } from '../../context/CartAnimationContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useToast } from '../../contexts/ToastContext';
import { productService } from '../../services/productService';
import QuickViewModal from '../QuickViewModal/QuickViewModal';
import { isCanonicalStoreSlug } from '../../utils/storeIdentity';
import { resolveColorSwatch } from '../../utils/colorSwatch';
import './ProductCard.css';

interface ProductCardProps {
  id: number | string;
  sku?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  colors?: string[];
  sizes?: string[];
  variants?: Array<{
    color: string;
    colorHex?: string;
    size: string;
    backendId?: string;
  }>;
  backendId?: string;
  // Multi-vendor fields
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  isOfficialStore?: boolean;
  staticMode?: boolean;
  showQuickView?: boolean;
  onQuickAdd?: (item: {
    id: string | number;
    backendId?: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    storeId?: string;
    storeName?: string;
    isOfficialStore?: boolean;
  }) => void;
}

const areStringArraysEqual = (left?: string[], right?: string[]) => {
  if (left === right) return true;
  if (!left || !right) return !left && !right;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
};

const normalizeSizeList = (rows?: string[]) =>
  Array.from(new Set((rows || []).map((size) => String(size || '').trim()).filter(Boolean)));

const ONE_SIZE_TOKENS = new Set(['free', 'f', 'one size', 'onesize', 'os']);

const isOneSizeToken = (size: string) => ONE_SIZE_TOKENS.has(String(size || '').trim().toLowerCase());

const normalizeVariantList = (rows?: Array<{ color: string; colorHex?: string; size: string; backendId?: string }>) =>
  (rows || [])
    .map((variant) => ({
      color: String(variant.color || '').trim(),
      colorHex: String(variant.colorHex || '').trim(),
      size: String(variant.size || '').trim(),
      backendId: variant.backendId,
    }))
    .filter((variant) => Boolean(variant.size));

const ProductCardInteractive = ({
  id,
  sku,
  name,
  price,
  originalPrice,
  image,
  badge,
  colors,
  sizes,
  variants,
  backendId,
  storeId,
  storeName,
  storeSlug,
  isOfficialStore,
  showQuickView = false,
}: ProductCardProps) => {
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const { triggerAnimation } = useCartAnimation();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [addedSize, setAddedSize] = useState<string | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [resolvedSizes, setResolvedSizes] = useState<string[]>(() => normalizeSizeList(sizes));
  const [resolvedVariants, setResolvedVariants] = useState(() => normalizeVariantList(variants));
  const [isHydratingVariants, setIsHydratingVariants] = useState(false);
  const [didHydrateVariants, setDidHydrateVariants] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const productRouteKey = String(id);
  const isWished = isInWishlist(productRouteKey);

  useEffect(() => {
    setResolvedSizes(normalizeSizeList(sizes));
    setResolvedVariants(normalizeVariantList(variants));
    setIsHydratingVariants(false);
    setDidHydrateVariants(false);
  }, [id, backendId, sku, sizes, variants]);

  const variantSizes = Array.from(new Set((resolvedVariants || []).map((variant) => variant.size).filter(Boolean)));
  const availableSizes = variantSizes.length > 0 ? variantSizes : resolvedSizes;
  const oneSizeValue = availableSizes.length === 1 && isOneSizeToken(availableSizes[0]) ? availableSizes[0] : null;
  const selectedColorValue = colors?.[selectedColorIdx] ?? '';
  const hasStoreSlug = isCanonicalStoreSlug(storeSlug);
  const colorHexByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const variant of resolvedVariants || []) {
      const color = String(variant.color || '').trim();
      const hex = String(variant.colorHex || '').trim();
      if (!color || !hex || map.has(color)) {
        continue;
      }
      map.set(color, hex);
    }
    return map;
  }, [resolvedVariants]);

  const hydrateVariantMetadata = async () => {
    if (didHydrateVariants || isHydratingVariants || availableSizes.length > 0) {
      return;
    }

    setIsHydratingVariants(true);
    const identifiers = Array.from(new Set(
      [backendId, sku, productRouteKey]
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ));

    try {
      for (const identifier of identifiers) {
        const detail = await productService.getByIdentifier(identifier);
        if (!detail) {
          continue;
        }

        const detailVariants = normalizeVariantList(
          (detail.variants || []).map((variant) => ({
            color: variant.color,
            size: variant.size,
            backendId: variant.backendId,
          })),
        );
        const detailSizes = normalizeSizeList(detail.sizes);
        const sizesFromVariants = normalizeSizeList(detailVariants.map((variant) => variant.size));
        const normalizedSizes = detailSizes.length > 0 ? detailSizes : sizesFromVariants;

        if (detailVariants.length === 0 && normalizedSizes.length === 0) {
          continue;
        }

        if (detailVariants.length > 0) {
          setResolvedVariants(detailVariants);
        }
        setResolvedSizes(normalizedSizes);
        break;
      }
    } finally {
      setDidHydrateVariants(true);
      setIsHydratingVariants(false);
    }
  };

  const handleSizeClick = async (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();

    const normalizedSize = size.toLowerCase();
    const normalizedColor = selectedColorValue.toLowerCase();
    const localVariantId = resolvedVariants.find((variant) => (
      variant.size.toLowerCase() === normalizedSize
      && (!normalizedColor || variant.color.toLowerCase() === normalizedColor)
    ))?.backendId || resolvedVariants.find((variant) => variant.size.toLowerCase() === normalizedSize)?.backendId;
    const purchaseReference = localVariantId
      ? { backendProductId: backendId, backendVariantId: localVariantId, activeVariantCount: resolvedVariants.length || 0 }
      : await productService.resolvePurchaseReference(
        String(backendId || productRouteKey),
        selectedColorValue || undefined,
        size || undefined,
        { forceRefresh: true, strictPublic: Boolean(backendId) },
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
      name,
      price,
      originalPrice,
      image,
      color: selectedColorValue || 'Mặc định',
      size,
      storeId: storeId || 'default-store',
      storeName: storeName || 'Cửa hàng',
      isOfficialStore: isOfficialStore || false,
    });

    setAddedSize(size);
    triggerAnimation({
      imgSrc: image,
      imageRect: imageRef.current?.getBoundingClientRect() || null,
      fallbackPoint: { x: e.clientX, y: e.clientY },
    });
    
    setTimeout(() => setAddedSize(null), 1500);
  };

  const handleColorClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColorIdx(idx);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWished) {
      removeFromWishlist(productRouteKey);
    } else {
      triggerAnimation({
        imgSrc: image,
        imageRect: imageRef.current?.getBoundingClientRect() || null,
        fallbackPoint: { x: e.clientX, y: e.clientY },
        target: 'wishlist',
      });
      addToWishlist({
        id: productRouteKey,
        name,
        price,
        originalPrice,
        image,
        storeId,
        storeName,
        isOfficialStore,
      });
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  return (
    <div className="product-card">
      <div
        className="product-image-container"
        onMouseEnter={() => {
          if (availableSizes.length === 0 && !didHydrateVariants) {
            void hydrateVariantMetadata();
          }
        }}
      >
        {/* Wishlist Icon */}
        <button 
          className={`product-wishlist-btn ${isWished ? 'wished' : ''}`}
          onClick={handleToggleWishlist}
          title={isWished ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
          aria-label="Wishlist"
        >
          <Heart size={20} fill={isWished ? "currentColor" : "none"} strokeWidth={isWished ? 1 : 1.5} />
        </button>

        <Link to={`/product/${productRouteKey}`}>
          <img
            ref={imageRef}
            src={image}
            alt={name}
            className="product-image"
            loading="lazy"
            width={672}
            height={990}
          />
          {badge && <span className={`product-badge ${badge === 'SALE' ? 'badge-sale' : ''}`}>{badge}</span>}
          {!badge && discount > 0 && (
            <span className="product-badge badge-sale">-{discount}%</span>
          )}
        </Link>

        {/* Quick View Button */}
        {showQuickView ? (
          <button
            className="product-quick-view-btn"
            onClick={handleQuickView}
            title="Xem nhanh"
          >
            <Eye size={18} /> Xem nhanh
          </button>
        ) : null}

        {/* Hover Quick-Add Panel */}
        <div className="quick-add-overlay">
          <div className="quick-add-panel">
            <p className="quick-add-label">
              Thêm nhanh vào giỏ hàng <Plus size={14} strokeWidth={2.5} />
            </p>
            <div className="quick-add-sizes">
              {oneSizeValue ? (
                <button
                  className={`quick-size-btn ${addedSize === oneSizeValue ? 'added' : ''}`}
                  onClick={(e) => handleSizeClick(e, oneSizeValue)}
                  title="Thêm nhanh"
                >
                  {addedSize === oneSizeValue ? '✓' : 'Thêm nhanh'}
                </button>
              ) : availableSizes.length > 0 ? (
                availableSizes.map((size) => (
                  <button
                    key={size}
                    className={`quick-size-btn ${addedSize === size ? 'added' : ''}`}
                    onClick={(e) => handleSizeClick(e, size)}
                    title={`Thêm size ${size}`}
                  >
                    {addedSize === size ? '✓' : size}
                  </button>
                ))
              ) : (
                <span className="quick-add-status">
                  {isHydratingVariants ? 'Đang tải kích cỡ...' : 'Không có kích cỡ'}
                </span>
              )}
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
                onClick={(e) => handleColorClick(e, idx)}
                aria-label={`Chọn màu ${idx + 1}`}
              >
                <span
                  className="swatch-inner"
                  style={{ backgroundColor: resolveColorSwatch(colorHexByName.get(color) || color) }}
                ></span>
              </button>
            ))}
          </div>
        )}
         <Link to={`/product/${productRouteKey}`} className="product-name-link">
           <h3 className="product-name">{name}</h3>
         </Link>
         
        <div className="product-prices">
          <span className="current-price">{price.toLocaleString('vi-VN')}đ</span>
          {originalPrice && <span className="original-price">{originalPrice.toLocaleString('vi-VN')}đ</span>}
        </div>

        {(storeName || storeId) && (
          <div className="product-store-attribution">
            <Store size={12} />
            {hasStoreSlug ? (
              <Link
                to={`/store/${storeSlug}`}
                className="store-link"
                onClick={(e) => e.stopPropagation()}
              >
                <span>{storeName || 'Người bán'}</span>
              </Link>
            ) : (
              <span className="store-link is-disabled">
                <span>{storeName || 'Người bán'}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Render modal only when opened to reduce per-card render cost */}
      {showQuickView && isQuickViewOpen ? (
        <QuickViewModal
          product={{
            id: productRouteKey,
            backendId,
            sku,
            name,
            price,
            originalPrice,
            image,
            colors,
            sizes: resolvedSizes,
            variants: resolvedVariants,
            storeId,
            storeName,
            isOfficialStore,
          }}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
        />
      ) : null}
    </div>
  );
};

const ProductCardDisplay = ({
  id,
  name,
  price,
  originalPrice,
  image,
  badge,
  backendId,
  storeId,
  storeName,
  storeSlug,
  isOfficialStore,
  onQuickAdd,
}: ProductCardProps) => {
  const productRouteKey = String(id);
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;
  const hasStoreSlug = isCanonicalStoreSlug(storeSlug);
  const imageRef = useRef<HTMLImageElement>(null);
  const { triggerAnimation } = useCartAnimation();

  return (
    <div className="product-card">
      <div className="product-image-container">
        <Link to={`/product/${productRouteKey}`}>
          <img
            ref={imageRef}
            src={image}
            alt={name}
            className="product-image"
            loading="lazy"
            width={672}
            height={990}
          />
          {badge && <span className={`product-badge ${badge === 'SALE' ? 'badge-sale' : ''}`}>{badge}</span>}
          {!badge && discount > 0 ? <span className="product-badge badge-sale">-{discount}%</span> : null}
        </Link>
        {onQuickAdd ? (
          <button
            type="button"
            className="product-static-quick-add"
            title="Thêm vào giỏ"
            aria-label="Thêm vào giỏ"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerAnimation({
                imgSrc: image,
                imageRect: imageRef.current?.getBoundingClientRect() || null,
                fallbackPoint: { x: e.clientX, y: e.clientY },
              });
              onQuickAdd({
                id,
                backendId,
                name,
                price,
                originalPrice,
                image,
                storeId,
                storeName,
                isOfficialStore,
              });
            }}
          >
            <ShoppingBag size={15} strokeWidth={2.5} />
          </button>
        ) : null}
      </div>

      <div className="product-info">
        <Link to={`/product/${productRouteKey}`} className="product-name-link">
          <h3 className="product-name">{name}</h3>
        </Link>

        <div className="product-prices">
          <span className="current-price">{price.toLocaleString('vi-VN')}đ</span>
          {originalPrice ? <span className="original-price">{originalPrice.toLocaleString('vi-VN')}đ</span> : null}
        </div>

        {(storeName || storeId) ? (
          <div className="product-store-attribution">
            <Store size={12} />
            {hasStoreSlug ? (
              <Link
                to={`/store/${storeSlug}`}
                className="store-link"
                onClick={(e) => e.stopPropagation()}
              >
                <span>{storeName || 'Người bán'}</span>
              </Link>
            ) : (
              <span className="store-link is-disabled">
                <span>{storeName || 'Người bán'}</span>
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ProductCard = (props: ProductCardProps) => {
  if (props.staticMode) {
    return <ProductCardDisplay {...props} />;
  }
  return <ProductCardInteractive {...props} />;
};

function arePropsEqual(prev: ProductCardProps, next: ProductCardProps) {
  return (
    prev.id === next.id &&
    prev.sku === next.sku &&
    prev.name === next.name &&
    prev.price === next.price &&
    prev.originalPrice === next.originalPrice &&
    prev.image === next.image &&
    prev.badge === next.badge &&
    areStringArraysEqual(prev.colors, next.colors) &&
    areStringArraysEqual(prev.sizes, next.sizes) &&
    JSON.stringify(prev.variants) === JSON.stringify(next.variants) &&
    prev.backendId === next.backendId &&
    prev.storeId === next.storeId &&
    prev.storeName === next.storeName &&
    prev.storeSlug === next.storeSlug &&
    prev.isOfficialStore === next.isOfficialStore &&
    prev.staticMode === next.staticMode &&
    prev.showQuickView === next.showQuickView &&
    prev.onQuickAdd === next.onQuickAdd
  );
}

const ProductCardMemo = memo(ProductCard, arePropsEqual);

export default ProductCardMemo;


