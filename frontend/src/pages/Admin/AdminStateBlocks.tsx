import { AlertCircle, Inbox, RefreshCw, SearchX } from 'lucide-react';

type StateType = 'empty' | 'search-empty' | 'error';

interface AdminStateBlockProps {
  type: StateType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const AdminStateBlock = ({ type, title, description, actionLabel, onAction }: AdminStateBlockProps) => {
  const icon =
    type === 'error' ? <AlertCircle size={22} /> : type === 'search-empty' ? <SearchX size={22} /> : <Inbox size={22} />;

  return (
    <div className={`admin-state-block ${type}`} role="status" aria-live="polite">
      <div className="admin-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button className="admin-ghost-btn" onClick={onAction}>
          <RefreshCw size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
};

interface AdminTableSkeletonProps {
  columns: number;
  rows?: number;
}

export const AdminTableSkeleton = ({ columns, rows = 6 }: AdminTableSkeletonProps) => {
  return (
    <div className="admin-skeleton-wrap" aria-label="Đang tải dữ liệu">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="admin-skeleton-row" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <span key={`${rowIndex}-${colIndex}`} className="admin-skeleton-cell" />
          ))}
        </div>
      ))}
    </div>
  );
};
