import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../ProductCard/ProductCard';
import './FlashSaleSection.css';

export interface FlashSaleItem {
  id: string | number;
  backendProductId?: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  colors?: string[];
  sizes?: string[];
  variants?: Array<{
    color: string;
    size: string;
    backendId?: string;
  }>;
  storeName: string;
  storeId?: string;
  storeSlug?: string;
  isOfficialStore?: boolean;
  soldCount: number;
  totalStock: number;
}

interface FlashSaleSectionProps {
  items?: FlashSaleItem[];
  viewAllLink?: string;
}

const getRemainingSecondsToEndOfDay = () => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
};

const toTimeParts = (seconds: number) => {
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  return [
    String(hh).padStart(2, '0'),
    String(mm).padStart(2, '0'),
    String(ss).padStart(2, '0'),
  ];
};

const FlashSaleSection = ({
  items = [],
  viewAllLink = '/search?scope=products&sort=discount',
}: FlashSaleSectionProps) => {
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingSecondsToEndOfDay());
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds(getRemainingSecondsToEndOfDay());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeParts = useMemo(() => toTimeParts(remainingSeconds), [remainingSeconds]);

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

  if (!items || items.length === 0) return null;

  return (
    <section className="flash-sale-section container">
      <div className="flash-sale-header">
        <div className="flash-sale-header-left">
          <h2 className="flash-sale-title">Flash Sale</h2>
          <div className="flash-sale-timer">
            {timeParts.map((part, i) => (
              <div key={`t-${i}`} style={{ display: 'flex', alignItems: 'center' }}>
                <span className="flash-sale-timer-digit">{part}</span>
                {i < timeParts.length - 1 ? <span className="flash-sale-timer-sep">:</span> : null}
              </div>
            ))}
          </div>
        </div>
        <Link to={viewAllLink} className="flash-sale-view-all">
          {'Xem t\u1ea5t c\u1ea3'}
        </Link>
      </div>

      <div className="flash-slider-container">
        <button className="flash-slider-nav prev-btn" onClick={scrollLeft} aria-label={'Tr\u01b0\u1edbc'}>
          <ChevronLeft size={24} />
        </button>

        <div className="flash-sale-track" ref={sliderRef}>
          {items.map((item) => {
            const safeStock = Math.max(1, Math.round(item.totalStock || 0));
            const soldCount = Math.min(safeStock, Math.max(0, Math.round(item.soldCount || 0)));
            const progress = Math.min(100, Math.round((soldCount / safeStock) * 100));
            const isAlmostOut = progress > 80;

            return (
              <article key={item.id} className="flash-card">
                <div className="flash-card-product">
                  <ProductCard
                    id={item.id}
                    backendId={item.backendProductId}
                    name={item.name}
                    image={item.image}
                    price={item.price}
                    originalPrice={item.originalPrice}
                    badge={item.badge}
                    colors={item.colors}
                    sizes={item.sizes}
                    variants={item.variants}
                    storeName={item.storeName}
                    storeId={item.storeId}
                    storeSlug={item.storeSlug}
                    isOfficialStore={item.isOfficialStore}
                  />
                </div>

                <div className="flash-progress-wrap">
                  <div
                    className={`flash-progress-fill${isAlmostOut ? ' almost-out' : ''}`}
                    style={{ width: `${progress}%` }}
                  />

                  {isAlmostOut && progress < 100 ? (
                    <div className="flash-fire-icon">
                      <svg width="10" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                      </svg>
                    </div>
                  ) : null}

                  <span className={`flash-progress-text${progress < 50 ? ' low' : ''}`}>
                    {progress >= 100 ? 'H\u1ebft h\u00e0ng' : `\u0110\u00e3 b\u00e1n ${soldCount}`}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        <button className="flash-slider-nav next-btn" onClick={scrollRight} aria-label="Sau">
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  );
};

export default FlashSaleSection;
