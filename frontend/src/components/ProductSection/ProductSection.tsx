import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ProductSection.css';
import ProductCard from '../ProductCard/ProductCard';

interface ProductSectionItem {
  id: number | string;
  sku?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  colors?: string[];
  sizes?: string[];
  backendId?: string;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  isOfficialStore?: boolean;
}

interface ProductSectionProps {
  title: string;
  products: ProductSectionItem[];
  viewAllLink?: string;
}

const ProductSection = ({ title, products, viewAllLink = '/search?scope=products' }: ProductSectionProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="product-section container">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <Link to={viewAllLink} className="view-all-link">{'Xem t\u1ea5t c\u1ea3'}</Link>
      </div>

      <div className="slider-container">
        <button className="slider-nav prev-btn" onClick={scrollLeft} aria-label={'Tr\u01b0\u1edbc'}>
          <ChevronLeft size={24} />
        </button>

        <div className="product-grid slider-view" ref={sliderRef}>
          {products.map((product) => (
            <div key={product.id} className="slider-item">
              <ProductCard {...product} />
            </div>
          ))}
        </div>

        <button className="slider-nav next-btn" onClick={scrollRight} aria-label="Sau">
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  );
};

export default ProductSection;
