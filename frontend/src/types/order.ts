export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderStatusStep {
  label: string;
  timestamp: string;
  description?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  addressSummary: string;
  paymentMethod: string;
  statusSteps: OrderStatusStep[];
}
