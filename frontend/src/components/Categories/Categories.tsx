import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import './Categories.css';
import type {
  MarketplaceStoreCard,
  MarketplaceHomeCategoryTab,
} from '../../services/marketplaceService';

interface CategoriesProps {
  categoryTabs?: MarketplaceHomeCategoryTab[];
  featuredStores?: MarketplaceStoreCard[];
  showFeaturedStores?: boolean;
}

const Categories = ({
  categoryTabs,
  featuredStores = [],
  showFeaturedStores = true,
}: CategoriesProps) => {
  const tabs = useMemo(() => (categoryTabs && categoryTabs.length > 0 ? categoryTabs : []), [categoryTabs]);
  const visibleStores = useMemo(() => featuredStores.slice(0, 4), [featuredStores]);
  const [selectedTab, setSelectedTab] = useState<string>(tabs[0]?.id || 'nam');
  if (tabs.length === 0) {
    return null;
  }

  const activeTab = tabs.some((tab) => tab.id === selectedTab) ? selectedTab : (tabs[0]?.id || 'nam');
  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const currentData = currentTab?.items || [];
  const toCategoryLink = (slug: string) => `/category/${encodeURIComponent(slug)}`;

  return (
    <section className="categories-section container">
      <div className="tab-buttons">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setSelectedTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="categories-grid" key={activeTab}>
        {currentData.map((cat) => (
          <Link to={toCategoryLink(cat.slug)} key={cat.id} className="category-card">
            <div className="category-img-wrapper">
              <img src={cat.image} alt={cat.name} className="category-img" />
            </div>
            <span className="category-name">{cat.name}</span>
          </Link>
        ))}
      </div>

      {showFeaturedStores && visibleStores.length > 0 && (
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
