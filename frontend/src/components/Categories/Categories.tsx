import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import './Categories.css';
import type { MarketplaceStoreCard } from '../../services/marketplaceService';

const mensCategories = [
  { id: 'm1', name: '\u00c1O NAM', img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop' },
  { id: 'm2', name: 'QU\u1ea6N NAM', img: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?q=80&w=400&auto=format&fit=crop' },
  { id: 'm3', name: '\u0110\u1ed2 TH\u1ec2 THAO NAM', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400&auto=format&fit=crop' },
  { id: 'm4', name: '\u0110\u1ed2 M\u1eb6C NH\u00c0', img: 'https://images.unsplash.com/photo-1618354691438-25af0475c28f?q=80&w=400&auto=format&fit=crop' },
  { id: 'm5', name: 'PH\u1ee4 KI\u1ec6N NAM', img: 'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?q=80&w=400&auto=format&fit=crop' },
];

const womensCategories = [
  { id: 'w1', name: '\u00c1O N\u1eee', img: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?q=80&w=400&auto=format&fit=crop' },
  { id: 'w2', name: 'V\u00c1Y / \u0110\u1ea6M', img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=400&auto=format&fit=crop' },
  { id: 'w3', name: 'QU\u1ea6N N\u1eee', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=400&auto=format&fit=crop' },
  { id: 'w4', name: '\u0110\u1ed2 M\u1eb6C NH\u00c0', img: 'https://images.unsplash.com/photo-1583496920310-91890e2b96e5?q=80&w=400&auto=format&fit=crop' },
  { id: 'w5', name: '\u0110\u1ed2 TH\u1ec2 THAO N\u1eee', img: 'https://images.unsplash.com/photo-1580436427382-706f9d45cc4e?q=80&w=400&auto=format&fit=crop' },
  { id: 'w6', name: 'PH\u1ee4 KI\u1ec6N N\u1eee', img: 'https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=400&auto=format&fit=crop' },
];

const featuredStoresFallback: MarketplaceStoreCard[] = [
  {
    id: 'store-coolmate-mall',
    name: 'Coolmate Mall',
    storeCode: 'SHOP-CM-001',
    slug: 'coolmate-mall',
    logo: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop',
    rating: 4.9,
    totalOrders: 0,
    liveProductCount: 0,
  },
  {
    id: 'store-thinh-fashion',
    name: 'Th\u1ecbnh Fashion Shop',
    storeCode: 'SHOP-TF-028',
    slug: 'thinh-fashion',
    logo: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?q=80&w=200&auto=format&fit=crop',
    rating: 4.8,
    totalOrders: 0,
    liveProductCount: 0,
  },
  {
    id: 'store-mina-boutique',
    name: 'Mina Boutique',
    storeCode: 'SHOP-MB-104',
    slug: 'mina-boutique',
    logo: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=200&auto=format&fit=crop',
    rating: 4.7,
    totalOrders: 0,
    liveProductCount: 0,
  },
  {
    id: 'store-athleisure-pro',
    name: 'Athleisure Pro',
    storeCode: 'SHOP-AP-233',
    slug: 'athleisure-pro',
    logo: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=200&auto=format&fit=crop',
    rating: 4.8,
    totalOrders: 0,
    liveProductCount: 0,
  },
];

interface CategoriesProps {
  featuredStores?: MarketplaceStoreCard[];
  showFeaturedStores?: boolean;
}

const Categories = ({ featuredStores = featuredStoresFallback, showFeaturedStores = true }: CategoriesProps) => {
  const [activeTab, setActiveTab] = useState<'nam' | 'nu'>('nam');
  const currentData = activeTab === 'nam' ? mensCategories : womensCategories;
  const visibleStores = featuredStores.length > 0 ? featuredStores : featuredStoresFallback;
  const toCategorySearchLink = (categoryName: string) =>
    `/search?scope=products&q=${encodeURIComponent(categoryName)}`;

  return (
    <section className="categories-section container">
      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'nam' ? 'active' : ''}`}
          onClick={() => setActiveTab('nam')}
        >
          NAM
        </button>
        <button
          className={`tab-btn ${activeTab === 'nu' ? 'active' : ''}`}
          onClick={() => setActiveTab('nu')}
        >
          {'N\u1eee'}
        </button>
      </div>

      <div className="categories-grid" key={activeTab}>
        {currentData.map((cat) => (
          <Link to={toCategorySearchLink(cat.name)} key={cat.id} className="category-card">
            <div className="category-img-wrapper">
              <img src={cat.img} alt={cat.name} className="category-img" />
            </div>
            <span className="category-name">{cat.name}</span>
          </Link>
        ))}
      </div>

      {showFeaturedStores && (
        <div className="featured-stores">
          <div className="featured-stores-head">
            <h3>{'C\u1eeda h\u00e0ng n\u1ed5i b\u1eadt'}</h3>
            <Link to="/search?scope=stores">{'Xem t\u1ea5t c\u1ea3 c\u1eeda h\u00e0ng'}</Link>
          </div>
          <div className="featured-stores-grid">
            {visibleStores.map((store) => (
              <Link key={store.id} to={`/store/${store.slug}`} className="featured-store-card">
                <img src={store.logo} alt={store.name} className="featured-store-logo" />
                <div className="featured-store-meta">
                  <span className="featured-store-code">{store.storeCode}</span>
                  <span className="featured-store-name">{store.name}</span>
                  <span className="featured-store-rating">
                    <Star size={12} fill="currentColor" />
                    {store.rating.toFixed(1)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default Categories;
