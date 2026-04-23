import { useState, useEffect, useMemo } from 'react';
import './ProductGrid.css';
import ProductCard from '../ProductCard/ProductCard';
import ProductCardSkeleton from '../ProductCardSkeleton/ProductCardSkeleton';
import { productService } from '../../services/productService';
import { CLIENT_TEXT } from '../../utils/texts';
import { CLIENT_DICTIONARY } from '../../utils/clientDictionary';
import type { Product } from '../../types';
import { useClientViewState } from '../../hooks/useClientViewState';

const t = CLIENT_TEXT.filter;
const tListing = CLIENT_TEXT.productListing;

type SortKey = 'newest' | 'bestseller' | 'price-asc' | 'price-desc' | 'discount';

interface ProductGridViewState {
  priceRanges: string[];
  colors: string[];
  sortKey: SortKey;
  setSort: (value: SortKey) => void;
}

interface ProductGridProps {
  customResults?: Product[];
  viewState?: ProductGridViewState;
  itemsPerPage?: number;
  scrollToTopOnPageChange?: boolean;
}

type PaginationToken = number | 'dots';

const buildPaginationTokens = (currentPage: number, totalPages: number): PaginationToken[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: PaginationToken[] = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) {
    tokens.push('dots');
  }

  for (let page = left; page <= right; page += 1) {
    tokens.push(page);
  }

  if (right < totalPages - 1) {
    tokens.push('dots');
  }

  tokens.push(totalPages);
  return tokens;
};

const ProductGrid = ({ customResults, viewState, itemsPerPage, scrollToTopOnPageChange = false }: ProductGridProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [catalog, setCatalog] = useState<Product[]>(() => customResults || productService.list());
  const [pageByScope, setPageByScope] = useState<Record<string, number>>({});
  const internalView = useClientViewState({ validSortKeys: ['newest', 'bestseller', 'price-asc', 'price-desc', 'discount'] });
  const view = viewState ?? internalView;

  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      void (async () => {
        const nextCatalog = customResults || await productService.listPublic();
        if (!isMounted) {
          return;
        }
        setCatalog(nextCatalog);
        setIsLoading(false);
      })();
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [customResults]);

  const filteredProducts = useMemo(() => {
    let results = customResults || catalog;

    if (view.priceRanges.length > 0) {
      results = results.filter((product) => {
        return view.priceRanges.some((range) => {
          if (range === 'under-200k') return product.price < 200000;
          if (range === 'from-200k-500k') return product.price >= 200000 && product.price <= 500000;
          if (range === 'over-500k') return product.price > 500000;
          return false;
        });
      });
    }

    if (view.colors.length > 0) {
      results = results.filter((product) => {
        return product.colors && product.colors.some((colorHex) => view.colors.some((selectedColor) => selectedColor.toLowerCase() === colorHex.toLowerCase()));
      });
    }

    switch (view.sortKey) {
      case 'price-asc':
        results = [...results].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results = [...results].sort((a, b) => b.price - a.price);
        break;
      case 'discount':
        results = [...results].sort((a, b) => {
          const discountA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
          const discountB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
          return discountB - discountA;
        });
        break;
      case 'newest':
      case 'bestseller':
      default:
        break;
    }

    return results;
  }, [view.priceRanges, view.colors, view.sortKey, customResults, catalog]);

  const totalProducts = filteredProducts.length;
  const hasPagination = typeof itemsPerPage === 'number' && itemsPerPage > 0;
  const pageSize = hasPagination ? Math.max(1, Math.floor(itemsPerPage)) : totalProducts || 1;
  const totalPages = hasPagination ? Math.max(1, Math.ceil(totalProducts / pageSize)) : 1;
  const paginationScope = useMemo(() => JSON.stringify({
    hasPagination,
    pageSize,
    sortKey: view.sortKey,
    priceRanges: [...view.priceRanges].sort(),
    colors: [...view.colors].sort(),
    customResultsKey: customResults ? customResults.map((product) => String(product.id)).join('|') : 'catalog',
  }), [hasPagination, pageSize, view.sortKey, view.priceRanges, view.colors, customResults]);
  const rawCurrentPage = pageByScope[paginationScope] ?? 1;
  const currentPage = hasPagination ? Math.min(Math.max(rawCurrentPage, 1), totalPages) : 1;

  const scrollViewportToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const scrollingElement = document.scrollingElement as HTMLElement | null;
    scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const appContainer = document.querySelector<HTMLElement>('.app-container');
    appContainer?.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      appContainer?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  const changePage = (nextPage: number) => {
    const normalized = Math.min(Math.max(nextPage, 1), totalPages);
    if (normalized === currentPage) {
      return;
    }

    if (hasPagination && scrollToTopOnPageChange) {
      scrollViewportToTop();
    }
    setPageByScope((current) => ({
      ...current,
      [paginationScope]: normalized,
    }));
  };

  const pagedProducts = useMemo(() => {
    if (!hasPagination) {
      return filteredProducts;
    }
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [hasPagination, filteredProducts, currentPage, pageSize]);

  const rangeStart = totalProducts === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = totalProducts === 0 ? 0 : Math.min(currentPage * pageSize, totalProducts);
  const paginationTokens = useMemo(
    () => (hasPagination ? buildPaginationTokens(currentPage, totalPages) : []),
    [hasPagination, currentPage, totalPages],
  );
  const dictionary = CLIENT_DICTIONARY.listing;

  return (
    <div className="product-grid-container">
      <div className="plp-toolbar">
        <div className="toolbar-left">
          <span className="results-count">
            {dictionary.resultsLabel
              .replace('{start}', String(rangeStart))
              .replace('{end}', String(rangeEnd))
              .replace('{total}', String(totalProducts))}
          </span>
        </div>
        <div className="toolbar-right">
          <label htmlFor="sort-select" className="sort-label">{t.sort.label}:</label>
          <select
            id="sort-select"
            className="sort-select"
            value={view.sortKey}
            onChange={(e) => view.setSort(e.target.value as SortKey)}
          >
            <option value="newest">{t.sort.newest}</option>
            <option value="bestseller">{t.sort.bestseller}</option>
            <option value="price-asc">{t.sort.priceAsc}</option>
            <option value="price-desc">{t.sort.priceDesc}</option>
            <option value="discount">{t.sort.discount}</option>
          </select>
        </div>
      </div>

      <div className="plp-grid">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))
          : pagedProducts.length > 0
          ? pagedProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))
          : (
              <div className="no-products">
                <p>{dictionary.empty}</p>
              </div>
            )}
      </div>

      {hasPagination && totalPages > 1 && (
        <div className="plp-pagination">
          <button
            type="button"
            className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
            disabled={currentPage === 1}
            onClick={() => changePage(currentPage - 1)}
          >
            {tListing.prevPage}
          </button>

          <div className="pagination-numbers">
            {paginationTokens.map((token, index) => (
              token === 'dots' ? (
                <span key={`dots-${index}`} className="page-dots">...</span>
              ) : (
                <button
                  type="button"
                  key={token}
                  className={`page-number ${token === currentPage ? 'active' : ''}`}
                  onClick={() => changePage(token)}
                >
                  {token}
                </button>
              )
            ))}
          </div>

          <button
            type="button"
            className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
            disabled={currentPage === totalPages}
            onClick={() => changePage(currentPage + 1)}
          >
            {tListing.nextPage}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
