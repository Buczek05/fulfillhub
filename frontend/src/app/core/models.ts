// Typy odpowiadające kontraktowi API backendu (patrz /api/docs).

export type Role = 'ADMIN' | 'WAREHOUSE' | 'SHOP';

export type OrderStatus = 'NEW' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'CANCELLED';

export type MovementType = 'RECEIPT' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE' | 'SHIPMENT';

export interface User {
  id: number;
  email: string;
  role: Role;
  shopId: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface Shop {
  id: number;
  name: string;
  contactEmail: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  shopId: number;
  sku: string;
  name: string;
  ean: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  type: MovementType;
  quantity: number;
  reason: string | null;
  orderId: number | null;
  userId: number | null;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  sku: string;
  name: string;
  quantity: number;
}

export interface Shipment {
  id: number;
  carrier: string;
  trackingNumber: string;
  shippedAt: string;
}

export interface Order {
  id: number;
  shopId: number;
  externalRef: string;
  status: OrderStatus;
  recipientName: string;
  recipientAddress: string;
  recipientEmail: string | null;
  items: OrderItem[];
  shipment: Shipment | null;
  createdAt: string;
  cancelledAt: string | null;
}

export interface OrderSummary {
  id: number;
  shopId: number;
  externalRef: string;
  status: OrderStatus;
  recipientName: string;
  itemCount: number;
  createdAt: string;
  cancelledAt: string | null;
}

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DashboardSummary {
  ordersByStatus: Record<OrderStatus, number>;
  lowStockProducts: number;
  recentOrders: OrderSummary[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

// Etykiety po polsku – UI jest polski, API angielskie.
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  WAREHOUSE: 'Magazynier',
  SHOP: 'Sklep',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Nowe',
  PICKING: 'Kompletacja',
  PACKED: 'Spakowane',
  SHIPPED: 'Wysłane',
  CANCELLED: 'Anulowane',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  RECEIPT: 'Przyjęcie',
  ADJUSTMENT: 'Korekta',
  RESERVATION: 'Rezerwacja',
  RELEASE: 'Zwolnienie rezerwacji',
  SHIPMENT: 'Wysyłka',
};
