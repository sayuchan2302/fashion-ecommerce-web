import { useMemo, useState } from 'react';
import type { Product } from '../../types';
import './ProductDescription.css';

interface ProductDescriptionProps {
  product: Product;
}

type TabKey = 'details' | 'size-fit' | 'fabric-care';

const DEFAULT_DETAILS = 'Nhà bán chưa cập nhật thông tin chi tiết cho sản phẩm này.';
const DEFAULT_SIZE_FIT = [
  'Phom dáng thoải mái, dễ mặc trong nhiều hoàn cảnh.',
  'Bạn có thể tham khảo bảng kích cỡ để chọn size phù hợp.',
];
const DEFAULT_FABRIC_CARE = [
  'Nhà bán chưa cập nhật thông tin chất liệu và bảo quản.',
];

const splitLines = (value?: string) =>
  (value || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const ProductDescription = ({ product }: ProductDescriptionProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  const detailsText = (product.description || '').trim() || DEFAULT_DETAILS;

  const sizeFitItems = useMemo(() => {
    const source = product.sizeAndFit || product.highlights;
    const lines = splitLines(source);
    if (lines.length > 0) {
      return lines;
    }

    const fallback: string[] = [];
    if (product.fit) {
      fallback.push(`Kiểu dáng: ${product.fit}`);
    }
    if (product.gender) {
      const genderMap: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', UNISEX: 'Unisex' };
      fallback.push(`Phù hợp cho: ${genderMap[product.gender.toUpperCase()] || product.gender}`);
    }
    return fallback.length > 0 ? fallback : DEFAULT_SIZE_FIT;
  }, [product.fit, product.gender, product.highlights, product.sizeAndFit]);

  const fabricCareItems = useMemo(() => {
    const source = product.fabricAndCare
      || [product.material, product.careInstructions].filter(Boolean).join('\n');
    const lines = splitLines(source);
    return lines.length > 0 ? lines : DEFAULT_FABRIC_CARE;
  }, [product.careInstructions, product.fabricAndCare, product.material]);

  return (
    <div className="product-description-container">
      <div className="desc-tabs-header">
        <button
          className={`desc-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Thông tin chi tiết
        </button>
        <button
          className={`desc-tab-btn ${activeTab === 'size-fit' ? 'active' : ''}`}
          onClick={() => setActiveTab('size-fit')}
        >
          Kích cỡ & kiểu dáng
        </button>
        <button
          className={`desc-tab-btn ${activeTab === 'fabric-care' ? 'active' : ''}`}
          onClick={() => setActiveTab('fabric-care')}
        >
          Chất liệu & hướng dẫn bảo quản
        </button>
      </div>

      <div className="desc-tabs-content">
        {activeTab === 'details' && (
          <div className="tab-pane active">
            <h3>Thông tin chi tiết</h3>
            <div className="tab-text" style={{ whiteSpace: 'pre-line' }}>
              {detailsText}
            </div>
          </div>
        )}

        {activeTab === 'size-fit' && (
          <div className="tab-pane active">
            <h3>Kích cỡ & kiểu dáng</h3>
            <ul className="feature-list">
              {sizeFitItems.map((item, index) => (
                <li key={`size-fit-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'fabric-care' && (
          <div className="tab-pane active">
            <h3>Chất liệu & hướng dẫn bảo quản</h3>
            <ul className="feature-list">
              {fabricCareItems.map((item, index) => (
                <li key={`fabric-care-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDescription;
