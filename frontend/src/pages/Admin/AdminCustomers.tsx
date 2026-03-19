import './Admin.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Eye, Pencil, Ban, X, Mail, Download, Gift, ChevronDown, Sparkles, Users, ShieldCheck, Gem, Wallet, Link2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { AdminStateBlock, AdminTableSkeleton } from './AdminStateBlocks';
import { useAdminListState } from './useAdminListState';
import { ADMIN_VIEW_KEYS, clearPersistedAdminView, getPersistedAdminView, setPersistedAdminView, shareAdminViewUrl } from './adminListView';

type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
type AccountStatus = 'active' | 'banned';
type DrawerTab = 'activity' | 'preferences' | 'notes';

interface CustomerOrder {
  code: string;
  date: string;
  total: number;
  status: 'pending' | 'shipping' | 'done' | 'canceled';
}

interface FavoriteCategory {
  name: string;
  purchases: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  tier: LoyaltyTier;
  totalOrders: number;
  totalSpent: number;
  status: AccountStatus;
  lastOrder: string;
  createdAt: string;
  address: string;
  dob: string;
  note: string;
  orderHistory: CustomerOrder[];
  favoriteCategories: FavoriteCategory[];
}

const initialCustomers: Customer[] = [
  {
    id: 'cus-001',
    name: 'Nguyễn Minh Anh',
    email: 'minhanh@gmail.com',
    phone: '0909 112 233',
    avatar: 'https://i.pravatar.cc/80?img=32',
    tier: 'Diamond',
    totalOrders: 42,
    totalSpent: 28650000,
    status: 'active',
    lastOrder: '2026-03-16T14:20:00',
    createdAt: '2024-08-11T09:00:00',
    address: '102 Nguyễn Huệ, Quận 1, TP.HCM',
    dob: '1996-04-12',
    note: 'Khách VIP, ưu tiên giao nhanh và hotline riêng.',
    orderHistory: [
      { code: 'ORD-30451', date: '2026-03-16T14:20:00', total: 1850000, status: 'done' },
      { code: 'ORD-30380', date: '2026-03-11T18:10:00', total: 1260000, status: 'done' },
      { code: 'ORD-30120', date: '2026-02-22T10:08:00', total: 920000, status: 'done' },
      { code: 'ORD-29801', date: '2026-02-01T19:12:00', total: 1450000, status: 'shipping' },
      { code: 'ORD-29400', date: '2026-01-14T09:20:00', total: 860000, status: 'done' },
    ],
    favoriteCategories: [
      { name: 'Áo Polo', purchases: 5 },
      { name: 'Quần Short', purchases: 3 },
      { name: 'Áo Thun Basic', purchases: 2 },
    ],
  },
  {
    id: 'cus-002',
    name: 'Lê Hoàng Đức',
    email: 'hoangduc@outlook.com',
    phone: '0933 881 776',
    tier: 'Gold',
    totalOrders: 18,
    totalSpent: 9340000,
    status: 'active',
    lastOrder: '2026-03-14T09:45:00',
    createdAt: '2025-11-05T08:10:00',
    address: '18 Lê Đại Hành, Hai Bà Trưng, Hà Nội',
    dob: '1998-09-03',
    note: 'Thường mua combo, phản hồi tích cực.',
    orderHistory: [
      { code: 'ORD-30312', date: '2026-03-14T09:45:00', total: 2140000, status: 'done' },
      { code: 'ORD-30199', date: '2026-03-05T16:22:00', total: 720000, status: 'done' },
      { code: 'ORD-30004', date: '2026-02-18T20:30:00', total: 760000, status: 'done' },
      { code: 'ORD-29751', date: '2026-01-30T11:09:00', total: 520000, status: 'done' },
      { code: 'ORD-29590', date: '2026-01-19T07:55:00', total: 610000, status: 'done' },
    ],
    favoriteCategories: [
      { name: 'Áo Khoác', purchases: 4 },
      { name: 'Áo Polo', purchases: 3 },
      { name: 'Phụ kiện', purchases: 2 },
    ],
  },
  {
    id: 'cus-003',
    name: 'Trần Bảo Ngọc',
    email: 'baongoc@yahoo.com',
    phone: '0988 331 447',
    avatar: 'https://i.pravatar.cc/80?img=44',
    tier: 'Silver',
    totalOrders: 7,
    totalSpent: 2450000,
    status: 'active',
    lastOrder: '2026-03-01T11:10:00',
    createdAt: '2026-03-01T09:50:00',
    address: '22 Trần Phú, Nha Trang, Khánh Hòa',
    dob: '2001-01-16',
    note: '',
    orderHistory: [
      { code: 'ORD-29641', date: '2026-03-01T11:10:00', total: 590000, status: 'done' },
      { code: 'ORD-29588', date: '2026-02-27T15:20:00', total: 460000, status: 'done' },
      { code: 'ORD-29512', date: '2026-02-20T13:30:00', total: 250000, status: 'done' },
      { code: 'ORD-29390', date: '2026-01-13T10:45:00', total: 420000, status: 'canceled' },
      { code: 'ORD-29301', date: '2026-01-08T08:01:00', total: 510000, status: 'done' },
    ],
    favoriteCategories: [
      { name: 'Áo Thun Basic', purchases: 4 },
      { name: 'Áo Polo', purchases: 2 },
      { name: 'Váy/Skirt', purchases: 1 },
    ],
  },
  {
    id: 'cus-004',
    name: 'Phạm Quỳnh Như',
    email: 'quynhnhu@icloud.com',
    phone: '0977 556 112',
    tier: 'Bronze',
    totalOrders: 2,
    totalSpent: 620000,
    status: 'banned',
    lastOrder: '2026-01-21T17:05:00',
    createdAt: '2026-01-08T13:20:00',
    address: '77 Hồ Tùng Mậu, Cầu Giấy, Hà Nội',
    dob: '2002-10-21',
    note: 'Tài khoản đã khóa do phát hiện đơn hàng ảo.',
    orderHistory: [
      { code: 'ORD-28019', date: '2026-01-21T17:05:00', total: 320000, status: 'canceled' },
      { code: 'ORD-27930', date: '2026-01-10T08:32:00', total: 300000, status: 'done' },
      { code: 'ORD-27880', date: '2025-12-30T16:50:00', total: 280000, status: 'canceled' },
      { code: 'ORD-27821', date: '2025-12-25T08:06:00', total: 340000, status: 'canceled' },
      { code: 'ORD-27790', date: '2025-12-20T14:00:00', total: 260000, status: 'done' },
    ],
    favoriteCategories: [
      { name: 'Quần Short', purchases: 1 },
      { name: 'Áo Polo', purchases: 1 },
    ],
  },
  {
    id: 'cus-005',
    name: 'Đoàn Tuấn Kiệt',
    email: 'tuankiet@gmail.com',
    phone: '0911 222 119',
    tier: 'Silver',
    totalOrders: 11,
    totalSpent: 4760000,
    status: 'active',
    lastOrder: '2026-03-12T16:55:00',
    createdAt: '2025-10-12T11:00:00',
    address: '5 Nguyễn Thái Học, Đà Nẵng',
    dob: '1997-07-09',
    note: 'Hay đổi size, cần note kỹ size chart trước khi chốt đơn.',
    orderHistory: [
      { code: 'ORD-30210', date: '2026-03-12T16:55:00', total: 870000, status: 'done' },
      { code: 'ORD-30080', date: '2026-02-26T09:14:00', total: 390000, status: 'shipping' },
      { code: 'ORD-29860', date: '2026-02-03T21:10:00', total: 560000, status: 'done' },
      { code: 'ORD-29722', date: '2026-01-28T10:05:00', total: 490000, status: 'done' },
      { code: 'ORD-29491', date: '2026-01-15T13:40:00', total: 620000, status: 'done' },
    ],
    favoriteCategories: [
      { name: 'Áo Polo', purchases: 5 },
      { name: 'Quần Jean', purchases: 2 },
      { name: 'Áo Thun Basic', purchases: 2 },
    ],
  },
];

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'new', label: 'Khách mới' },
  { key: 'vip', label: 'Khách VIP' },
  { key: 'banned', label: 'Bị khóa' },
];

const validCustomerTabs = new Set(tabs.map((tab) => tab.key));

const tierOptions = [
  { value: 'all', label: 'Tất cả hạng' },
  { value: 'Bronze', label: 'Bronze' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Diamond', label: 'Diamond' },
];

const spendingOptions = [
  { value: 'all', label: 'Tất cả chi tiêu' },
  { value: 'under1m', label: 'Dưới 1 triệu' },
  { value: '1m-5m', label: '1 - 5 triệu' },
  { value: '5m-10m', label: '5 - 10 triệu' },
  { value: '10m+', label: 'Trên 10 triệu' },
];

const validTierFilters = new Set(tierOptions.map((option) => option.value));
const validSpendingFilters = new Set(spendingOptions.map((option) => option.value));

const tierToClass: Record<LoyaltyTier, string> = {
  Bronze: 'tier-bronze',
  Silver: 'tier-silver',
  Gold: 'tier-gold',
  Diamond: 'tier-diamond',
};

const moneyFormatter = new Intl.NumberFormat('vi-VN');
const formatCurrencyVnd = (value: number) => `${moneyFormatter.format(value)} đ`;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'KH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const spendingInRange = (totalSpent: number, range: string) => {
  if (range === 'all') return true;
  if (range === 'under1m') return totalSpent < 1000000;
  if (range === '1m-5m') return totalSpent >= 1000000 && totalSpent < 5000000;
  if (range === '5m-10m') return totalSpent >= 5000000 && totalSpent < 10000000;
  if (range === '10m+') return totalSpent >= 10000000;
  return true;
};

const isNewCustomer = (createdAt: string) => {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 30;
};

const isVipCustomer = (c: Customer) => c.tier === 'Gold' || c.tier === 'Diamond' || c.totalSpent >= 5000000;

const orderStatusTone = (status: CustomerOrder['status']) => {
  if (status === 'done') return 'success';
  if (status === 'shipping' || status === 'pending') return 'pending';
  return 'error';
};

const orderStatusLabel = (status: CustomerOrder['status']) => {
  if (status === 'done') return 'Hoàn tất';
  if (status === 'shipping') return 'Đang giao';
  if (status === 'pending') return 'Chờ xác nhận';
  return 'Đã hủy';
};

const AdminCustomers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchQuery = searchParams.get('q') || '';
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [activeTab, setActiveTab] = useState<string>(() => {
    const queryTab = searchParams.get('status') || searchParams.get('tab') || '';
    if (validCustomerTabs.has(queryTab)) return queryTab;
    const persisted = getPersistedAdminView(ADMIN_VIEW_KEYS.customers);
    return validCustomerTabs.has(persisted) ? persisted : 'all';
  });
  const [tierFilter, setTierFilter] = useState<'all' | LoyaltyTier>(() => {
    const queryTier = searchParams.get('tier') || 'all';
    return validTierFilters.has(queryTier) ? (queryTier as 'all' | LoyaltyTier) : 'all';
  });
  const [spendingFilter, setSpendingFilter] = useState<string>(() => {
    const querySpend = searchParams.get('spend') || 'all';
    return validSpendingFilters.has(querySpend) ? querySpend : 'all';
  });
  const [openFilter, setOpenFilter] = useState<'tier' | 'spending' | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerCustomerId, setDrawerCustomerId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('activity');
  const [draftNote, setDraftNote] = useState('');
  const [toast, setToast] = useState('');
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  const {
    search,
    setSearch,
    isLoading,
    filteredItems: filtered,
    page,
    totalPages,
    startIndex,
    endIndex,
    pagedItems: pagedCustomers,
    next,
    prev,
    setPage,
    clearFilters,
  } = useAdminListState<Customer>({
    items: customers,
    pageSize: 8,
    initialSearch: initialSearchQuery,
    getSearchText: (c) => `${c.name} ${c.email} ${c.phone}`,
    filterPredicate: (c) => {
      if (activeTab === 'new' && !isNewCustomer(c.createdAt)) return false;
      if (activeTab === 'vip' && !isVipCustomer(c)) return false;
      if (activeTab === 'banned' && c.status !== 'banned') return false;
      if (tierFilter !== 'all' && c.tier !== tierFilter) return false;
      if (!spendingInRange(c.totalSpent, spendingFilter)) return false;
      return true;
    },
    loadingDeps: [activeTab, tierFilter, spendingFilter],
  });

  const activeCustomer = useMemo(() => customers.find((c) => c.id === drawerCustomerId) ?? null, [customers, drawerCustomerId]);
  const tierFilterLabel = tierOptions.find((o) => o.value === tierFilter)?.label ?? 'Tất cả hạng';
  const spendingFilterLabel = spendingOptions.find((o) => o.value === spendingFilter)?.label ?? 'Tất cả chi tiêu';
  const filteredTotalSpent = useMemo(() => filtered.reduce((sum, item) => sum + item.totalSpent, 0), [filtered]);
  const filteredVipCount = useMemo(() => filtered.filter((item) => isVipCustomer(item)).length, [filtered]);
  const filteredActiveCount = useMemo(() => filtered.filter((item) => item.status === 'active').length, [filtered]);

  useEffect(() => {
    const queryTab = searchParams.get('status') || searchParams.get('tab') || '';
    const nextTab = validCustomerTabs.has(queryTab) ? queryTab : 'all';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
      setSelected(new Set());
    }

    const queryTier = searchParams.get('tier') || 'all';
    const nextTier = validTierFilters.has(queryTier) ? (queryTier as 'all' | LoyaltyTier) : 'all';
    if (nextTier !== tierFilter) {
      setTierFilter(nextTier);
      setSelected(new Set());
    }

    const querySpend = searchParams.get('spend') || 'all';
    const nextSpend = validSpendingFilters.has(querySpend) ? querySpend : 'all';
    if (nextSpend !== spendingFilter) {
      setSpendingFilter(nextSpend);
      setSelected(new Set());
    }
  }, [searchParams, activeTab, tierFilter, spendingFilter]);

  useEffect(() => {
    const querySearch = searchParams.get('q') || '';
    if (querySearch !== search) {
      setSearch(querySearch);
    }
  }, [searchParams, search, setSearch]);

  useEffect(() => {
    setPersistedAdminView(ADMIN_VIEW_KEYS.customers, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openFilter) return;
      if (!filterDropdownRef.current) return;
      if (!filterDropdownRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openFilter) setOpenFilter(null);
      else if (drawerCustomerId) closeDrawer();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [openFilter, drawerCustomerId]);

  const pushToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2300);
  };

  const syncViewParams = (next: { tab?: string; keyword?: string; tier?: 'all' | LoyaltyTier; spend?: string }) => {
    const nextTab = next.tab ?? activeTab;
    const nextKeyword = next.keyword ?? search;
    const nextTier = next.tier ?? tierFilter;
    const nextSpend = next.spend ?? spendingFilter;
    const params = new URLSearchParams();
    if (nextTab !== 'all') params.set('status', nextTab);
    if (nextKeyword.trim()) params.set('q', nextKeyword.trim());
    if (nextTier !== 'all') params.set('tier', nextTier);
    if (nextSpend !== 'all') params.set('spend', nextSpend);
    setSearchParams(params);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    syncViewParams({ keyword: value });
  };

  const changeTab = (nextTab: string) => {
    setActiveTab(nextTab);
    setSelected(new Set());
    syncViewParams({ tab: nextTab });
  };

  const changeTierFilter = (nextTier: 'all' | LoyaltyTier) => {
    setTierFilter(nextTier);
    setSelected(new Set());
    setOpenFilter(null);
    syncViewParams({ tier: nextTier });
  };

  const changeSpendingFilter = (nextSpend: string) => {
    setSpendingFilter(nextSpend);
    setSelected(new Set());
    setOpenFilter(null);
    syncViewParams({ spend: nextSpend });
  };

  const shareCurrentView = async () => {
    try {
      await shareAdminViewUrl(`/admin/customers${window.location.search}`);
      pushToast('Đã copy link view hiện tại.');
    } catch {
      pushToast('Không thể copy link, vui lòng thử lại.');
    }
  };

  const resetCurrentView = () => {
    clearFilters();
    setActiveTab('all');
    setTierFilter('all');
    setSpendingFilter('all');
    setSelected(new Set());
    setOpenFilter(null);
    setSearchParams({});
    clearPersistedAdminView(ADMIN_VIEW_KEYS.customers);
    pushToast('Đã đặt lại view khách hàng về mặc định.');
  };

  const toggleSelectAll = (checked: boolean) => setSelected(checked ? new Set(filtered.map((c) => c.id)) : new Set());

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const openDrawer = (customer: Customer, tab: DrawerTab = 'activity') => {
    setDrawerCustomerId(customer.id);
    setDrawerTab(tab);
    setDraftNote(customer.note ?? '');
  };

  const closeDrawer = () => {
    setDrawerCustomerId(null);
    setDraftNote('');
  };

  const toggleBanStatus = (customerId: string) => {
    setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, status: c.status === 'active' ? 'banned' : 'active' } : c)));
    const user = customers.find((c) => c.id === customerId);
    if (user) pushToast(user.status === 'active' ? `Đã khóa tài khoản ${user.name}` : `Đã mở khóa tài khoản ${user.name}`);
  };

  const saveAdminNote = () => {
    if (!activeCustomer) return;
    setCustomers((prev) => prev.map((c) => (c.id === activeCustomer.id ? { ...c, note: draftNote.trim() } : c)));
    pushToast('Đã lưu ghi chú nội bộ');
  };

  const selectedIds = Array.from(selected);
  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label || 'Tất cả';
  const hasViewContext = activeTab !== 'all' || tierFilter !== 'all' || spendingFilter !== 'all' || Boolean(search.trim());

  const handleBulkSendVoucher = () => {
    if (!selectedIds.length) return;
    pushToast(`Đã gửi voucher cho ${selectedIds.length} khách hàng`);
  };

  const handleBulkBan = () => {
    if (!selectedIds.length) return;
    const targetIds = new Set(customers.filter((c) => selected.has(c.id) && c.status !== 'banned').map((c) => c.id));
    if (targetIds.size === 0) {
      pushToast('Các tài khoản đã ở trạng thái bị khóa');
      return;
    }
    setCustomers((prev) => prev.map((c) => (targetIds.has(c.id) ? { ...c, status: 'banned' } : c)));
    pushToast(`Đã khóa ${targetIds.size} tài khoản`);
    setSelected(new Set());
  };

  const handleBulkSendEmail = () => {
    if (!selectedIds.length) return;
    pushToast(`Đã gửi email đến ${selectedIds.length} khách hàng`);
  };

  const handleExport = () => {
    pushToast(`Đã xuất dữ liệu ${filtered.length} khách hàng (mô phỏng)`);
  };

  return (
    <AdminLayout
      title="Khách hàng"
      actions={
        <div className="customer-actions" ref={filterDropdownRef}>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm tên, email, số điện thoại..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          </div>

          <button className="admin-ghost-btn" onClick={shareCurrentView}><Link2 size={16} /> Share view</button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Reset view</button>

          <button className="admin-icon-btn subtle" onClick={handleExport} title="Xuất dữ liệu khách hàng" aria-label="Xuất dữ liệu khách hàng">
            <Download size={16} />
          </button>

          <div className="admin-filter-dropdown-wrap">
            <button className="admin-filter-trigger" onClick={() => setOpenFilter((p) => (p === 'tier' ? null : 'tier'))}>
              <Sparkles size={15} />
              <span>{tierFilterLabel}</span>
              <ChevronDown size={14} className={openFilter === 'tier' ? 'rotate' : ''} />
            </button>
            <AnimatePresence>
              {openFilter === 'tier' && (
                <motion.div className="admin-filter-menu" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.18 }}>
                  {tierOptions.map((option) => (
                    <button key={option.value} className={`admin-filter-item ${tierFilter === option.value ? 'active' : ''}`} onClick={() => changeTierFilter(option.value as 'all' | LoyaltyTier)}>
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="admin-filter-dropdown-wrap">
            <button className="admin-filter-trigger" onClick={() => setOpenFilter((p) => (p === 'spending' ? null : 'spending'))}>
              <Sparkles size={15} />
              <span>{spendingFilterLabel}</span>
              <ChevronDown size={14} className={openFilter === 'spending' ? 'rotate' : ''} />
            </button>
            <AnimatePresence>
              {openFilter === 'spending' && (
                <motion.div className="admin-filter-menu" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.18 }}>
                  {spendingOptions.map((option) => (
                    <button key={option.value} className={`admin-filter-item ${spendingFilter === option.value ? 'active' : ''}`} onClick={() => changeSpendingFilter(option.value)}>
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="customer-result-chip">Kết quả: {filtered.length}</div>
        </div>
      }
    >
      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button key={tab.key} className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => changeTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {hasViewContext && (
        <div className="admin-view-summary">
          <span className="summary-chip">Nhóm: {activeTabLabel}</span>
          {search.trim() && <span className="summary-chip">Từ khóa: {search.trim()}</span>}
          {tierFilter !== 'all' && <span className="summary-chip">Hạng: {tierFilterLabel}</span>}
          {spendingFilter !== 'all' && <span className="summary-chip">Chi tiêu: {spendingFilterLabel}</span>}
          <button className="summary-clear" onClick={resetCurrentView}>Xóa bộ lọc</button>
        </div>
      )}

      <section className="customer-insights-grid">
        <motion.article className="customer-insight-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <div className="customer-insight-icon"><Users size={18} /></div>
          <p>Khách hàng theo bộ lọc</p>
          <h3>{filtered.length}</h3>
        </motion.article>

        <motion.article className="customer-insight-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.04 }}>
          <div className="customer-insight-icon"><ShieldCheck size={18} /></div>
          <p>Tài khoản đang hoạt động</p>
          <h3>{filteredActiveCount}</h3>
        </motion.article>

        <motion.article className="customer-insight-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.08 }}>
          <div className="customer-insight-icon"><Gem size={18} /></div>
          <p>Khách VIP</p>
          <h3>{filteredVipCount}</h3>
        </motion.article>

        <motion.article className="customer-insight-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.12 }}>
          <div className="customer-insight-icon"><Wallet size={18} /></div>
          <p>Tổng chi tiêu</p>
          <h3>{formatCurrencyVnd(filteredTotalSpent)}</h3>
        </motion.article>
      </section>

      <section className="admin-panels single">
        <div className="admin-panel">
          {isLoading ? (
            <AdminTableSkeleton columns={9} rows={7} />
          ) : filtered.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}
                description={search.trim() ? 'Hãy thử thay đổi bộ lọc hạng, chi tiêu hoặc từ khóa tìm kiếm.' : 'Khách hàng mới sẽ được ghi nhận tự động sau khi phát sinh đơn hàng.'}
                actionLabel="Đặt lại bộ lọc"
                onAction={resetCurrentView}
              />
          ) : (
          <div className="admin-table" role="table" aria-label="Danh sách khách hàng">
            <div className="admin-table-row admin-table-head customers" role="row">
              <div role="columnheader"><input type="checkbox" aria-label="Chọn tất cả" checked={selected.size === filtered.length && filtered.length > 0} onChange={(e) => toggleSelectAll(e.target.checked)} /></div>
              <div role="columnheader">Khách hàng</div>
              <div role="columnheader">Số điện thoại</div>
              <div role="columnheader">Hạng thành viên</div>
              <div role="columnheader">Tổng đơn</div>
              <div role="columnheader">Tổng chi tiêu</div>
              <div role="columnheader">Trạng thái</div>
              <div role="columnheader">Đơn gần nhất</div>
              <div role="columnheader">Hành động</div>
            </div>

            {pagedCustomers.map((customer, idx) => (
              <motion.div
                key={customer.id}
                className="admin-table-row customers customer-row"
                role="row"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.18) }}
                whileHover={{ y: -1 }}
              >
                <div role="cell"><input type="checkbox" aria-label={`Chọn ${customer.name}`} checked={selected.has(customer.id)} onChange={(e) => toggleOne(customer.id, e.target.checked)} /></div>
                <div role="cell" className="customer-info-cell">
                  {customer.avatar ? <img src={customer.avatar} alt={customer.name} className="customer-avatar" /> : <div className="customer-avatar initials">{getInitials(customer.name)}</div>}
                  <div className="customer-text">
                    <p className="admin-bold customer-name">{customer.name}</p>
                    <p className="admin-muted customer-email">{customer.email}</p>
                  </div>
                </div>
                <div role="cell" className="customer-phone">{customer.phone}</div>
                <div role="cell"><span className={`admin-pill ${tierToClass[customer.tier]}`}>{customer.tier}</span></div>
                <div role="cell" className="admin-bold">{customer.totalOrders}</div>
                <div role="cell" className="admin-bold customer-spent">{formatCurrencyVnd(customer.totalSpent)}</div>
                <div role="cell"><span className={`admin-pill ${customer.status === 'active' ? 'success' : 'error'}`}>{customer.status === 'active' ? 'Active' : 'Banned'}</span></div>
                <div role="cell" className="admin-muted">{formatDate(customer.lastOrder)}</div>
                <div role="cell" className="admin-actions">
                  <button className="admin-icon-btn subtle" title="Xem chi tiết" onClick={() => openDrawer(customer, 'activity')}><Eye size={16} /></button>
                  <button className="admin-icon-btn subtle" title="Sửa ghi chú" onClick={() => openDrawer(customer, 'notes')}><Pencil size={16} /></button>
                  <button className="admin-icon-btn subtle" title={customer.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} onClick={() => toggleBanStatus(customer.id)}><Ban size={16} /></button>
                </div>
              </motion.div>
            ))}
          </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="table-footer">
              <span className="admin-muted">Hiển thị {startIndex}-{endIndex} của {filtered.length} / {customers.length} khách hàng</span>
              <span className="admin-muted">Đã chọn: {selected.size}</span>
              <div className="pagination">
                <button className="page-btn" onClick={prev} disabled={page === 1}>Trước</button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button key={idx + 1} className={`page-btn ${page === idx + 1 ? 'active' : ''}`} onClick={() => setPage(idx + 1)}>
                    {idx + 1}
                  </button>
                ))}
                <button className="page-btn" onClick={next} disabled={page === totalPages}>Tiếp</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div className="customer-floating-bar" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 22 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="customer-floating-content">
              <span>{selected.size} khách hàng đã chọn</span>
              <div className="admin-actions">
                <button className="admin-ghost-btn" onClick={handleBulkSendVoucher}><Gift size={15} /> Gửi Voucher</button>
                <button className="admin-ghost-btn danger" onClick={handleBulkBan}><Ban size={15} /> Khóa tài khoản</button>
                <button className="admin-primary-btn" onClick={handleBulkSendEmail}><Mail size={15} /> Gửi Email</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerCustomerId && activeCustomer && (
          <>
            <motion.div className="drawer-overlay" onClick={closeDrawer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.div className="drawer customer-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.25, ease: 'easeOut' }}>
              <div className="drawer-header">
                <div>
                  <p className="drawer-eyebrow">Chi tiết khách hàng</p>
                  <h3>{activeCustomer.name}</h3>
                </div>
                <button className="admin-icon-btn" onClick={closeDrawer} aria-label="Đóng"><X size={16} /></button>
              </div>

              <div className="drawer-body customer-drawer-body">
                <section className="drawer-section">
                  <div className="customer-drawer-hero">
                    {activeCustomer.avatar ? <img src={activeCustomer.avatar} alt={activeCustomer.name} className="customer-avatar" /> : <div className="customer-avatar initials">{getInitials(activeCustomer.name)}</div>}
                    <div>
                      <p className="admin-bold">{activeCustomer.name}</p>
                      <p className="admin-muted small">{activeCustomer.email}</p>
                    </div>
                    <span className={`admin-pill ${tierToClass[activeCustomer.tier]}`}>{activeCustomer.tier}</span>
                  </div>
                  <div className="customer-profile-grid">
                    <div><p className="admin-muted small">Email</p><p className="admin-bold">{activeCustomer.email}</p></div>
                    <div><p className="admin-muted small">Số điện thoại</p><p className="admin-bold">{activeCustomer.phone}</p></div>
                    <div><p className="admin-muted small">Ngày sinh</p><p className="admin-bold">{formatDate(activeCustomer.dob)}</p></div>
                    <div><p className="admin-muted small">Địa chỉ</p><p className="admin-bold">{activeCustomer.address}</p></div>
                  </div>
                </section>

                <section className="drawer-section">
                  <div className="customer-drawer-tabs">
                    <button className={drawerTab === 'activity' ? 'active' : ''} onClick={() => setDrawerTab('activity')}>Hoạt động</button>
                    <button className={drawerTab === 'preferences' ? 'active' : ''} onClick={() => setDrawerTab('preferences')}>Sở thích</button>
                    <button className={drawerTab === 'notes' ? 'active' : ''} onClick={() => setDrawerTab('notes')}>Ghi chú Admin</button>
                  </div>

                  <AnimatePresence mode="wait">
                    {drawerTab === 'activity' && (
                      <motion.div key="activity" className="customer-tab-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                        <ul className="customer-timeline">
                          {activeCustomer.orderHistory.slice(0, 5).map((order) => (
                            <li key={order.code} className="customer-timeline-item">
                              <span className={`customer-timeline-dot ${orderStatusTone(order.status)}`} />
                              <div>
                                <p className="admin-bold">{order.code} · {formatCurrencyVnd(order.total)}</p>
                                <p className="admin-muted small">{formatDateTime(order.date)} · {orderStatusLabel(order.status)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    {drawerTab === 'preferences' && (
                      <motion.div key="preferences" className="customer-tab-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                        <ul className="customer-pref-list">
                          {activeCustomer.favoriteCategories.map((item) => (
                            <li key={item.name}>
                              <div className="customer-pref-label"><span>{item.name}</span><strong>{item.purchases} lần</strong></div>
                              <div className="customer-pref-bar"><span style={{ width: `${Math.min(100, item.purchases * 18)}%` }} /></div>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    {drawerTab === 'notes' && (
                      <motion.div key="notes" className="customer-tab-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                        <label className="form-field">
                          <span>Ghi chú nội bộ chỉ dành cho Admin</span>
                          <textarea rows={5} value={draftNote} onChange={(e) => setDraftNote(e.target.value)} placeholder="Ví dụ: Khách hay đổi trả size, ưu tiên liên hệ buổi tối..." />
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>

              <div className="drawer-footer">
                <button className="admin-ghost-btn" onClick={closeDrawer}>Đóng</button>
                <button className="admin-primary-btn" onClick={saveAdminNote}>Lưu ghi chú</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {toast && <div className="toast success">{toast}</div>}
    </AdminLayout>
  );
};

export default AdminCustomers;
