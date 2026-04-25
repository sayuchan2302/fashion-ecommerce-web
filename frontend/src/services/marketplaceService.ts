import { apiRequest } from './apiClient';
import type { Product } from '../types';
import { getOptimizedImageUrl } from '../utils/getOptimizedImageUrl';

export interface MarketplaceStoreCard {
  id: string;
  storeCode: string;
  name: string;
  slug: string;
  logo?: string;
  rating: number;
  totalOrders: number;
  liveProductCount: number;
}

export interface MarketplaceHomeCategoryItem {
  id: string;
  name: string;
  slug: string;
  image: string;
}

export interface MarketplaceHomeCategoryTab {
  id: 'nam' | 'nu' | 'phu-kien';
  label: string;
  slug: string;
  items: MarketplaceHomeCategoryItem[];
}

export interface MarketplaceHeaderCategoryLeaf {
  id: string;
  name: string;
  slug: string;
}

export interface MarketplaceHeaderCategoryGroup {
  id: string;
  name: string;
  slug: string;
  children: MarketplaceHeaderCategoryLeaf[];
}

export interface MarketplaceHeaderCategoryRoot {
  id: 'nam' | 'nu' | 'phu-kien';
  label: string;
  slug: string;
  children: MarketplaceHeaderCategoryGroup[];
}

export interface MarketplaceHomeData {
  featuredStores: MarketplaceStoreCard[];
  featuredProducts: Product[];
  trendingProducts: Product[];
  categoryTabs: MarketplaceHomeCategoryTab[];
}

interface MarketplaceProductCardPayload {
  id: string;
  slug?: string;
  productCode: string;
  name: string;
  image?: string;
  price?: number;
  priceAmount?: string;
  originalPrice?: number;
  originalPriceAmount?: string;
  badge?: string;
  colors?: string[];
  stock?: number;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  storeLogo?: string;
  officialStore?: boolean;
  sizes?: string[];
  variants?: Array<{
    id?: string;
    sku?: string;
    color?: string;
    colorHex?: string;
    size?: string;
    stockQuantity?: number;
  }>;
}

interface MarketplaceStoreCardPayload {
  id: string;
  storeCode?: string;
  name: string;
  slug: string;
  logo?: string;
  rating?: number;
  totalOrders?: number;
  liveProductCount?: number;
}

interface MarketplaceHomePayload {
  featuredStores?: MarketplaceStoreCardPayload[];
  featuredProducts?: MarketplaceProductCardPayload[];
  trendingProducts?: MarketplaceProductCardPayload[];
}

interface BackendCategoryTreeNode {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  children?: BackendCategoryTreeNode[];
}

interface BackendPage<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const optimizeMarketplaceImage = (rawUrl: string | null | undefined, width: number) =>
  getOptimizedImageUrl(rawUrl, { width, format: 'webp', quality: 74 });

const mapProductCard = (row: MarketplaceProductCardPayload): Product => {
  const price = toNumber(row.priceAmount ?? row.price, 0);
  const originalPrice = toNumber(row.originalPriceAmount ?? row.originalPrice, 0);
  const resolvedOriginalPrice = originalPrice > price ? originalPrice : undefined;
  const routeKey = (row.slug || row.productCode || row.id || '').trim();
  const normalizedRouteKey = routeKey || row.id;
  const variants = (row.variants || [])
    .filter((variant) => Boolean((variant.size || '').trim()))
    .map((variant, index) => ({
      id: (variant.sku || variant.id || `${normalizedRouteKey}-v${index + 1}`).trim(),
      backendId: (variant.id || '').trim() || undefined,
      size: (variant.size || '').trim(),
      color: (variant.color || '').trim(),
      colorHex: (variant.colorHex || '').trim() || undefined,
      sku: (variant.sku || '').trim(),
      price,
      stock: Math.max(0, Number(variant.stockQuantity || 0)),
    }));
  const sizes = row.sizes && row.sizes.length > 0
    ? Array.from(new Set(row.sizes.map((size) => String(size || '').trim()).filter(Boolean)))
    : Array.from(new Set(variants.map((variant) => variant.size).filter(Boolean)));

  return {
    id: normalizedRouteKey,
    sku: row.productCode || row.id,
    name: row.name || 'Sản phẩm',
    category: 'Marketplace',
    price,
    originalPrice: resolvedOriginalPrice,
    image:
      optimizeMarketplaceImage(row.image, 720)
      || optimizeMarketplaceImage('https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=672&h=990&fit=crop', 720),
    badge: row.badge,
    colors: row.colors || [],
    sizes: sizes.length > 0 ? sizes : undefined,
    stock: Number.isFinite(row.stock) ? Number(row.stock) : 0,
    status: 'ACTIVE',
    statusType: Number(row.stock || 0) <= 0 ? 'out' : Number(row.stock || 0) < 10 ? 'low' : 'active',
    variants: variants.length > 0 ? variants : undefined,
    storeId: row.storeId,
    storeName: row.storeName,
    storeSlug: row.storeSlug,
    storeLogo: row.storeLogo,
    isOfficialStore: Boolean(row.officialStore),
    backendId: row.id,
  };
};

const mapStoreCard = (row: MarketplaceStoreCardPayload): MarketplaceStoreCard => ({
  id: row.id,
  storeCode: (row.slug || row.storeCode || '').trim(),
  name: row.name,
  slug: row.slug,
  logo: row.logo,
  rating: toNumber(row.rating, 0),
  totalOrders: Math.max(0, Math.round(toNumber(row.totalOrders, 0))),
  liveProductCount: Math.max(0, Math.round(toNumber(row.liveProductCount, 0))),
});

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const resolveMarketplaceRoot = (
  trees: BackendCategoryTreeNode[],
  expectedSlug: string,
  expectedName: string,
): BackendCategoryTreeNode | undefined => {
  return trees.find((node) => {
    const slug = (node.slug || '').toLowerCase();
    const name = normalizeText(node.name || '');
    return slug === expectedSlug || name === expectedName;
  });
};

const mapHeaderRoot = (
  root: BackendCategoryTreeNode,
  id: 'nam' | 'nu' | 'phu-kien',
  label: string,
): MarketplaceHeaderCategoryRoot => ({
  id,
  label,
  slug: root.slug || id,
  children: (root.children || []).map((group) => ({
    id: group.id,
    name: group.name || 'Danh mục',
    slug: (group.slug || root.slug || id).trim(),
    children: (group.children || []).map((leaf) => ({
      id: leaf.id,
      name: leaf.name || 'Danh mục',
      slug: (leaf.slug || group.slug || root.slug || id).trim(),
    })),
  })),
});

const mapHeaderCategoryTree = (trees: BackendCategoryTreeNode[]): MarketplaceHeaderCategoryRoot[] => {
  if (!Array.isArray(trees) || trees.length === 0) {
    return [];
  }

  const menRoot = resolveMarketplaceRoot(trees, 'men', 'nam');
  const womenRoot = resolveMarketplaceRoot(trees, 'women', 'nu');
  const accessoryRoot = resolveMarketplaceRoot(trees, 'accessories', 'phu kien');

  const roots: MarketplaceHeaderCategoryRoot[] = [];
  if (menRoot) {
    roots.push(mapHeaderRoot(menRoot, 'nam', 'NAM'));
  }
  if (womenRoot) {
    roots.push(mapHeaderRoot(womenRoot, 'nu', 'NỮ'));
  }
  if (accessoryRoot) {
    roots.push(mapHeaderRoot(accessoryRoot, 'phu-kien', 'PHỤ KIỆN'));
  }

  return roots;
};

const mapHomeCategoryTab = (
  root: BackendCategoryTreeNode,
  tabId: 'nam' | 'nu' | 'phu-kien',
  label: string,
): MarketplaceHomeCategoryTab => {
  const children = root.children || [];
  const items = children.map((item) => {
    const slug = (item.slug || '').trim();
    const image =
      optimizeMarketplaceImage(item.image, 400) ||
      optimizeMarketplaceImage(root.image, 400) ||
      '';

    return {
      id: item.id,
      name: item.name || 'Danh mục',
      slug: slug || root.slug || tabId,
      image,
    };
  });

  return {
    id: tabId,
    label,
    slug: root.slug || tabId,
    items,
  };
};

const fetchHomeCategoryTabs = async (): Promise<MarketplaceHomeCategoryTab[]> => {
  const trees = await apiRequest<BackendCategoryTreeNode[]>('/api/categories/tree');
  if (!Array.isArray(trees) || trees.length === 0) {
    return [];
  }

  const menRoot = resolveMarketplaceRoot(trees, 'men', 'nam');
  const womenRoot = resolveMarketplaceRoot(trees, 'women', 'nu');
  const accessoryRoot = resolveMarketplaceRoot(trees, 'accessories', 'phu kien');

  const tabs: MarketplaceHomeCategoryTab[] = [];
  if (menRoot && (menRoot.children || []).length > 0) {
    tabs.push(mapHomeCategoryTab(menRoot, 'nam', 'NAM'));
  }
  if (womenRoot && (womenRoot.children || []).length > 0) {
    tabs.push(mapHomeCategoryTab(womenRoot, 'nu', 'NỮ'));
  }
  if (accessoryRoot && (accessoryRoot.children || []).length > 0) {
    tabs.push(mapHomeCategoryTab(accessoryRoot, 'phu-kien', 'PHỤ KIỆN'));
  }
  return tabs;
};

const fetchHeaderCategoryTree = async (): Promise<MarketplaceHeaderCategoryRoot[]> => {
  const trees = await apiRequest<BackendCategoryTreeNode[]>('/api/categories/tree');
  return mapHeaderCategoryTree(trees);
};

export const marketplaceService = {
  async getHomeData(): Promise<MarketplaceHomeData> {
    const [payload, categoryTabs] = await Promise.all([
      apiRequest<MarketplaceHomePayload>('/api/public/marketplace/home'),
      fetchHomeCategoryTabs().catch(() => [] as MarketplaceHomeCategoryTab[]),
    ]);

    return {
      featuredStores: (payload.featuredStores || []).map(mapStoreCard),
      featuredProducts: (payload.featuredProducts || []).map(mapProductCard),
      trendingProducts: (payload.trendingProducts || []).map(mapProductCard),
      categoryTabs,
    };
  },

  async getHeaderCategoryTree(): Promise<MarketplaceHeaderCategoryRoot[]> {
    try {
      return await fetchHeaderCategoryTree();
    } catch {
      return [];
    }
  },

  async searchProducts(query: string, page = 0, size = 20, categorySlug?: string) {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(Math.max(page, 0)));
    params.set('size', String(Math.max(size, 1)));
    const normalizedCategory = (categorySlug || '').trim();
    if (normalizedCategory) {
      params.set('category', normalizedCategory);
    }

    const payload = await apiRequest<BackendPage<MarketplaceProductCardPayload>>(
      `/api/public/marketplace/search/products?${params.toString()}`,
    );

    const rows = (payload.content || []).map(mapProductCard);
    return {
      items: rows,
      total: Number(payload.totalElements || rows.length),
      page: Number(payload.number || 0),
      size: Number(payload.size || size),
      totalPages: Number(payload.totalPages || 1),
    };
  },

  async searchStores(query: string, page = 0, size = 20) {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(Math.max(page, 0)));
    params.set('size', String(Math.max(size, 1)));

    const payload = await apiRequest<BackendPage<MarketplaceStoreCardPayload>>(
      `/api/public/marketplace/search/stores?${params.toString()}`,
    );

    const rows = (payload.content || []).map(mapStoreCard);
    return {
      items: rows,
      total: Number(payload.totalElements || rows.length),
      page: Number(payload.number || 0),
      size: Number(payload.size || size),
      totalPages: Number(payload.totalPages || 1),
    };
  },
};
