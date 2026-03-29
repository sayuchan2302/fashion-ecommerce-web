import { apiRequest } from '../../services/apiClient';

export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Review {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  productImage: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  content: string;
  date: string;
  status: ReviewStatus;
  reply: string | null;
  orderId?: string;
  orderCode?: string;
  version: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface BackendReview extends Omit<Review, 'status'> {
  status?: string | null;
}

const normalizeReviewStatus = (status?: string | null): ReviewStatus => {
  const normalized = status?.toLowerCase();
  if (normalized === 'approved') return 'approved';
  if (normalized === 'hidden') return 'hidden';
  return 'pending';
};

const mapBackendReview = (review: BackendReview): Review => ({
  ...review,
  status: normalizeReviewStatus(review.status),
});

export const adminReviewService = {
  getAll: async (params: { page?: number; size?: number; status?: string } = {}): Promise<PaginatedResponse<Review>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.status && params.status !== 'all') query.set('status', params.status.toUpperCase());

    const qs = query.toString();
    const response = await apiRequest<PaginatedResponse<BackendReview>>(
      `/api/reviews/admin/all${qs ? `?${qs}` : ''}`,
      {},
      { auth: true },
    );

    return {
      ...response,
      content: (response.content || []).map(mapBackendReview),
    };
  },

  updateStatus: async (id: string, status: ReviewStatus): Promise<Review> => {
    const response = await apiRequest<BackendReview>(
      `/api/reviews/admin/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: status.toUpperCase() }),
      },
      { auth: true },
    );
    return mapBackendReview(response);
  },

  addReply: async (id: string, reply: string): Promise<Review> => {
    const response = await apiRequest<BackendReview>(
      `/api/reviews/admin/${id}/reply`,
      {
        method: 'POST',
        body: JSON.stringify({ reply }),
      },
      { auth: true },
    );
    return mapBackendReview(response);
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/api/reviews/admin/${id}`, { method: 'DELETE' }, { auth: true });
  },
};
