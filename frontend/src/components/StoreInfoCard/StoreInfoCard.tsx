import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, MessageCircle, Clock, Star, ChevronRight, Store as StoreIcon } from 'lucide-react';
import './StoreInfoCard.css';

export interface StoreInfoCardProps {
  storeId?: string;
  storeName: string;
  storeSlug: string;
  storeLogo?: string;
  isOfficialStore?: boolean;
  /** Dummy stats for display */
  rating?: number;
  responseRate?: number;
  joinedMonthsAgo?: number;
}

const StoreInfoCard = ({
  storeName,
  storeSlug,
  storeLogo,
  isOfficialStore = false,
  rating = 4.8,
  responseRate = 98,
  joinedMonthsAgo = 6,
}: StoreInfoCardProps) => {
  const storeUrl = `/store/${storeSlug}`;

  return (
    <div className="store-info-card">
      <div className="store-info-header">
        <div className="store-info-brand">
          {storeLogo ? (
            <img src={storeLogo} alt={storeName} className="store-info-logo" />
          ) : (
            <div className="store-info-logo-placeholder">
              <StoreIcon size={20} strokeWidth={1.5} />
            </div>
          )}
          <div className="store-info-meta">
            <Link to={storeUrl} className="store-info-name">
              {storeName}
              {isOfficialStore && (
                <span className="store-info-official">
                  <BadgeCheck size={14} />
                  Official
                </span>
              )}
            </Link>
            <span className="store-info-slug">/store/{storeSlug}</span>
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Link to={storeUrl} className="store-info-visit-btn">
            Visit Store
            <ChevronRight size={16} />
          </Link>
        </motion.div>
      </div>

      <div className="store-info-stats">
        <div className="store-info-stat">
          <Star size={15} className="store-info-stat-icon star" />
          <span className="store-info-stat-value">{rating.toFixed(1)}</span>
          <span className="store-info-stat-label">Rating</span>
        </div>
        <div className="store-info-divider" />
        <div className="store-info-stat">
          <MessageCircle size={15} className="store-info-stat-icon response" />
          <span className="store-info-stat-value">{responseRate}%</span>
          <span className="store-info-stat-label">Response</span>
        </div>
        <div className="store-info-divider" />
        <div className="store-info-stat">
          <Clock size={15} className="store-info-stat-icon joined" />
          <span className="store-info-stat-value">{joinedMonthsAgo}</span>
          <span className="store-info-stat-label">Months</span>
        </div>
      </div>
    </div>
  );
};

export default StoreInfoCard;
