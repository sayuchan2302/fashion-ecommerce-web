import { apiRequest } from './apiClient';

export interface AdminDashboardMetrics {
  gmvDelivered: number;
  commissionDelivered: number;
  totalOrders: number;
  pendingStoreApprovals: number;
  lockedUsers: number;
  runningCampaigns: number;
}

export interface AdminDashboardQuickViews {
  pendingStoreApprovals: number;
  categoriesNeedReview: number;
  parentOrdersNeedAttention: number;
  pendingReturns: number;
}

export interface AdminDashboardTrendPoint {
  date: string;
  gmv: number;
  commission: number;
}

export interface AdminDashboardParentOrder {
  id: string;
  code?: string;
  customerName: string;
  total: number;
  issue: string;
  priority: 'high' | 'medium' | 'low';
  waitMinutes: number;
}

export interface AdminDashboardTopCategory {
  categoryId: string;
  name: string;
  productCount: number;
  signal: string;
}

export interface AdminDashboardResponse {
  metrics: AdminDashboardMetrics;
  quickViews: AdminDashboardQuickViews;
  trend: AdminDashboardTrendPoint[];
  parentOrders: AdminDashboardParentOrder[];
  topCategories: AdminDashboardTopCategory[];
}

export const adminDashboardService = {
  async get(): Promise<AdminDashboardResponse> {
    return apiRequest<AdminDashboardResponse>('/api/admin/dashboard', {}, { auth: true });
  },
};
