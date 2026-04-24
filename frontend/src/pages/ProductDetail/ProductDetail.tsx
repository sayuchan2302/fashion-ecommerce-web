import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Star, Store, CheckCircle, Clock, Send, MessageSquare, Camera, X } from 'lucide-react';
import ProductGallery from '../../components/ProductGallery/ProductGallery';
import ProductInfo from '../../components/ProductInfo/ProductInfo';
import ProductActions from '../../components/ProductActions/ProductActions';
import ProductDescription from '../../components/ProductDescription/ProductDescription';
import ProductDetailSkeleton from '../../components/ProductDetailSkeleton/ProductDetailSkeleton';
import StoreInfoCard from '../../components/StoreInfoCard/StoreInfoCard';
import { productService } from '../../services/productService';
import { reviewService } from '../../services/reviewService';
import { CLIENT_TEXT } from '../../utils/texts';
import { CLIENT_DICTIONARY } from '../../utils/clientDictionary';
import { useToast } from '../../contexts/ToastContext';
import type { Product } from '../../types';
import { normalizeStoreSlug } from '../../utils/storeIdentity';
import './ProductDetail.css';

interface ClientReviewItem {
  id: string;
  rating: number;
  content: string;
  reply?: string;
  createdAt: string;
  status?: string;
}

const t = CLIENT_TEXT.productDetail;
const REVIEW_MAX_IMAGES = 5;
const REVIEW_MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const StarInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="review-star-input" role="group" aria-label="Chọn số sao">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`review-star-btn ${(hovered || value) >= star ? 'active' : ''}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${star} sao`}
        >
          <Star size={28} fill={(hovered || value) >= star ? 'currentColor' : 'none'} />
        </button>
      ))}
      <span className="review-star-label">
        {(hovered || value) === 1 && 'Rất tệ'}
        {(hovered || value) === 2 && 'Tệ'}
        {(hovered || value) === 3 && 'Bình thường'}
        {(hovered || value) === 4 && 'Tốt'}
        {(hovered || value) === 5 && 'Tuyệt vời!'}
      </span>
    </div>
  );
};

const renderRating = (value: number) => (
  <div className="pdp-review-stars" aria-label={`Rating ${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={16}
        fill={value >= star ? 'currentColor' : 'none'}
        stroke={value >= star ? 'currentColor' : 'var(--co-gray-300)'}
        className={value >= star ? 'pdp-review-star-active' : 'pdp-review-star'}
      />
    ))}
  </div>
);

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<ClientReviewItem[]>([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [uploadingReviewImages, setUploadingReviewImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const reviewImageInputRef = useRef<HTMLInputElement | null>(null);

  const productId = id || '';
  const storeSlug = normalizeStoreSlug(product?.storeSlug);

  useEffect(() => {
    window.scrollTo(0, 0);
    let isMounted = true;

    const timer = setTimeout(() => {
      void (async () => {
        const fetched = (await productService.getByIdentifier(productId)) || productService.list()[0] || null;
        if (!isMounted) {
          return;
        }

        setProduct(fetched);
        setSubmitted(false);
        setReviewRating(0);
        setReviewContent('');
        setReviewImages([]);

        if (fetched) {
          const defaultVariant = fetched.variants?.[0];
          setSelectedColor(defaultVariant?.color || fetched.colors?.[0] || '');
          setSelectedSize(defaultVariant?.size || '');
        }

        const backendProductId = fetched?.backendId || '';
        if (!backendProductId) {
          setReviews([]);
          setCanReview(false);
          setIsLoading(false);
          return;
        }

        try {
          const [productReviews, eligibleReviewItems] = await Promise.all([
            reviewService.getReviewsByProduct(backendProductId),
            reviewService.getEligibleReviews(),
          ]);

          if (!isMounted) {
            return;
          }

          setReviews(productReviews);
          setCanReview(eligibleReviewItems.some((item) => item.productId === backendProductId));
        } catch {
          if (!isMounted) {
            return;
          }

          setReviews([]);
          setCanReview(false);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      })();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [productId]);

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();

    if (!canReview) {
      addToast('Chỉ khách hàng đã mua và nhận hàng mới có thể đánh giá sản phẩm này.', 'error');
      return;
    }

    if (reviewRating === 0) {
      addToast('Vui lòng chọn số sao đánh giá.', 'error');
      return;
    }

    if (reviewContent.trim().length < 10) {
      addToast('Nội dung đánh giá phải từ 10 ký tự trở lên.', 'error');
      return;
    }

    if (!product?.backendId) {
      addToast('Không thể gửi đánh giá cho sản phẩm này.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await reviewService.submitReview({
        storeId: product.storeId,
        productId: product.backendId,
        productName: product.name,
        productImage: product.image,
        rating: reviewRating,
        content: reviewContent.trim(),
        images: reviewImages.length > 0 ? reviewImages : undefined,
      });

      setSubmitted(true);
      setReviewRating(0);
      setReviewContent('');
      setReviewImages([]);
      setCanReview(false);
      addToast('Đánh giá đã được gửi, chờ phê duyệt.', 'success');
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Chỉ có thể đánh giá sản phẩm đã mua và đã giao.';
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadReviewImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      return;
    }

    const selectedFiles = Array.from(files);
    const availableSlots = REVIEW_MAX_IMAGES - reviewImages.length;
    if (availableSlots <= 0) {
      addToast(`Tối đa ${REVIEW_MAX_IMAGES} ảnh cho mỗi đánh giá.`, 'error');
      event.target.value = '';
      return;
    }

    const filesToUpload = selectedFiles.slice(0, availableSlots);
    if (filesToUpload.length < selectedFiles.length) {
      addToast(`Chỉ lấy ${REVIEW_MAX_IMAGES} ảnh đầu tiên.`, 'info');
    }

    for (const file of filesToUpload) {
      if (!file.type.toLowerCase().startsWith('image/')) {
        addToast('Chỉ chấp nhận file hình ảnh.', 'error');
        event.target.value = '';
        return;
      }
      if (file.size > REVIEW_MAX_IMAGE_SIZE) {
        addToast('Ảnh review vượt quá 5MB.', 'error');
        event.target.value = '';
        return;
      }
    }

    setUploadingReviewImages(true);
    try {
      const uploadedUrls = await Promise.all(filesToUpload.map((file) => reviewService.uploadReviewImage(file)));
      setReviewImages((prev) => Array.from(new Set([...prev, ...uploadedUrls])).slice(0, REVIEW_MAX_IMAGES));
    } catch (error: unknown) {
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : 'Tải ảnh review thất bại.';
      addToast(message, 'error');
    } finally {
      setUploadingReviewImages(false);
      event.target.value = '';
    }
  };

  const removeReviewImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const averageRating =
    reviews.length > 0 ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)) : null;

  if (isLoading || !product) {
    return (
      <div className="pdp-page">
        <div className="container pdp-container">
          <ProductDetailSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="pdp-page">
      <div className="breadcrumb-wrapper">
        <div className="container">
          <nav className="breadcrumbs">
            <Link to="/" className="breadcrumb-link">
              {CLIENT_TEXT.common.breadcrumb.home}
            </Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <Link to={`/category/${product.category || 'all'}`} className="breadcrumb-link">
              {product.category || CLIENT_TEXT.productListing.title}
            </Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container pdp-container">
        <div className="pdp-top-section">
          <div className="pdp-gallery-col">
            <ProductGallery images={product.images && product.images.length > 0 ? product.images : [product.image]} />

            {storeSlug && (
              <StoreInfoCard
                storeId={product.storeId}
                storeName={product.storeName || 'Cửa hàng'}
                storeSlug={storeSlug}
                storeLogo={product.storeLogo}
                isOfficialStore={product.isOfficialStore}
              />
            )}
          </div>

          <div className="pdp-info-col">
            <ProductInfo
              product={product}
              averageRating={averageRating}
              reviewCount={reviews.length}
              onVariantChange={(color, size) => {
                setSelectedColor(color);
                setSelectedSize(size);
              }}
            />
            <ProductActions
              product={{
                id: product.sku,
                backendId: product.backendId,
                name: product.name,
                price: product.price,
                originalPrice: product.originalPrice,
                image: product.image,
                storeId: product.storeId,
                storeName: product.storeName,
                isOfficialStore: product.isOfficialStore,
              }}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
            />
            <div className="pdp-review-summary">
              {averageRating !== null && (
                <div className="pdp-review-avg">
                  <Star size={15} fill="currentColor" className="pdp-star-filled" />
                  <span className="pdp-avg-value">{averageRating.toFixed(1)}</span>
                </div>
              )}
              <span className="pdp-review-count">
                {reviews.length} {CLIENT_DICTIONARY.reviews.countLabel}
              </span>
            </div>
            <div className="pd-size-help">
              <p className="pd-size-text">{t.sizeHelp.text}</p>
              <div className="pd-size-links">
                <Link to="/size-guide" className="pd-size-link">
                  {t.sizeHelp.sizeGuide}
                </Link>
                <Link to="/contact" className="pd-size-link">
                  {t.sizeHelp.consult}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="pdp-bottom-section">
          <ProductDescription product={product} />

          <div className="pdp-reviews-section">
            <div className="pdp-reviews-header">
              <div className="pdp-reviews-title-row">
                <h3 className="pdp-reviews-title">{CLIENT_DICTIONARY.reviews.title}</h3>
                {averageRating !== null && (
                  <div className="pdp-rating-chip">
                    <Star size={14} fill="currentColor" />
                    {averageRating.toFixed(1)} / 5
                  </div>
                )}
              </div>
              <span className="pdp-reviews-badge">
                {reviews.length} {CLIENT_DICTIONARY.reviews.countLabel}
              </span>
            </div>

            {reviews.length === 0 ? (
              <div className="pdp-reviews-empty">
                <MessageSquare size={32} strokeWidth={1.5} />
                <p>{CLIENT_DICTIONARY.reviews.empty}</p>
                {canReview && <span>Hãy là người đầu tiên đánh giá sản phẩm này!</span>}
              </div>
            ) : (
              <div className="pdp-reviews-list">
                {reviews.map((review) => (
                  <div key={review.id} className="pdp-review-card">
                    <div className="pdp-review-top">
                      {renderRating(review.rating)}
                      <span className="pdp-review-date">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <p className="pdp-review-content">{review.content}</p>
                    {review.reply && (
                      <div className="pdp-review-reply">
                        <span className="pdp-review-reply-label">
                          <Store size={11} />
                          {CLIENT_DICTIONARY.reviews.replyBadge}
                        </span>
                        <p className="pdp-review-reply-text">{review.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canReview ? (
              <div className="pdp-write-review">
                <div className="pdp-write-review-header">
                  <h4 className="pdp-write-review-title">Viết đánh giá của bạn</h4>
                  <p className="pdp-write-review-sub">Chia sẻ trải nghiệm để giúp khách hàng khác</p>
                </div>

                {submitted ? (
                  <div className="pdp-review-submitted">
                    <div className="pdp-review-submitted-icon">
                      <CheckCircle size={36} strokeWidth={1.5} />
                    </div>
                    <p className="pdp-review-submitted-title">Đánh giá đã được gửi!</p>
                    <p className="pdp-review-submitted-sub">
                      <Clock size={14} />
                      Đánh giá đang chờ phê duyệt, sẽ hiển thị sau khi được xác nhận.
                    </p>
                    <button className="pdp-review-submit-another" onClick={() => setSubmitted(false)}>
                      Viết thêm đánh giá
                    </button>
                  </div>
                ) : (
                  <form className="pdp-review-form" onSubmit={handleSubmitReview} noValidate>
                    <div className="pdp-form-field">
                      <label className="pdp-form-label">
                        Mức độ hài lòng <span className="required">*</span>
                      </label>
                      <StarInput value={reviewRating} onChange={setReviewRating} />
                    </div>

                    <div className="pdp-form-field">
                      <label className="pdp-form-label" htmlFor="review-content">
                        Nội dung đánh giá <span className="required">*</span>
                      </label>
                      <textarea
                        id="review-content"
                        className="pdp-review-textarea"
                        placeholder="Chia sẻ cảm nhận của bạn về chất liệu, form dáng, màu sắc... (tối thiểu 10 ký tự)"
                        value={reviewContent}
                        onChange={(e) => setReviewContent(e.target.value)}
                        rows={4}
                        maxLength={1000}
                      />
                      <span className="pdp-char-count">{reviewContent.length}/1000</span>
                    </div>

                    <div className="pdp-form-field">
                      <label className="pdp-form-label">Ảnh đính kèm (tùy chọn)</label>
                      <div className="pdp-review-upload-grid">
                        {reviewImages.map((imageUrl, index) => (
                          <div key={`${imageUrl}-${index}`} className="pdp-review-upload-item">
                            <img src={imageUrl} alt={`Review upload ${index + 1}`} />
                            <button
                              type="button"
                              className="pdp-review-upload-remove"
                              onClick={() => removeReviewImage(index)}
                              aria-label="Xóa ảnh"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {reviewImages.length < REVIEW_MAX_IMAGES && (
                          <button
                            type="button"
                            className="pdp-review-upload-add"
                            onClick={() => reviewImageInputRef.current?.click()}
                            disabled={uploadingReviewImages}
                          >
                            <Camera size={16} />
                            <span>{uploadingReviewImages ? 'Đang tải...' : 'Tải ảnh'}</span>
                          </button>
                        )}
                      </div>
                      <input
                        ref={reviewImageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={(event) => void handleUploadReviewImages(event)}
                        style={{ display: 'none' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className={`pdp-review-btn ${submitting ? 'loading' : ''}`}
                      disabled={submitting || uploadingReviewImages}
                    >
                      {submitting ? (
                        <>
                          <span className="pdp-btn-spinner" />
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          Gửi đánh giá
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
