export type ThemeMode = 'system' | 'light' | 'dark';
export type MemberRole = 'owner' | 'owner_mechanic' | 'mechanic' | 'apprentice';
export type WorkOrderStatus =
  | 'opened'
  | 'received'
  | 'queued'
  | 'precheck'
  | 'price_entered'
  | 'approval_waiting'
  | 'repair_started'
  | 'extra_approval_waiting'
  | 'parts_waiting'
  | 'testing'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'waiting'
  | 'in_progress'
  | 'completed';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'transfer';
export type ServiceType = 'appointment' | 'quick' | 'dropoff';
export type CustomerWaitingStatus = 'waiting_shop' | 'left_vehicle' | 'return_later' | 'third_party_delivery';
export type PriceType = 'estimated' | 'fixed';
export type AvailabilityStatus = 'available' | 'busy' | 'off';

export interface Profile {
  id: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_admin?: boolean;
}

export interface Workshop {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  is_active?: boolean;
  demo_batch_id?: string | null;
}

export interface WorkshopMember {
  workshop_id: string;
  user_id: string;
  role: MemberRole;
  is_active: boolean;
  availability_status?: AvailabilityStatus;
  staff_note?: string | null;
  profile?: Profile | null;
}

export interface Customer {
  id: string;
  workshop_id: string;
  full_name: string;
  phone?: string | null;
  note?: string | null;
  created_at: string;
}

export interface Motorcycle {
  id: string;
  workshop_id: string;
  customer_id: string;
  brand: string;
  model: string;
  plate?: string | null;
  year?: number | null;
  color?: string | null;
  odometer?: number | null;
}

export interface WorkOrderListItem {
  id: string;
  workshop_id?: string;
  status: WorkOrderStatus;
  payment_status: PaymentStatus;
  service_type: ServiceType;
  customer_waiting_status: CustomerWaitingStatus;
  queue_position?: number | null;
  complaint: string;
  total_amount: number;
  amount_received: number;
  price_type?: PriceType | null;
  estimated_price_min?: number | null;
  estimated_price_max?: number | null;
  quoted_price?: number | null;
  arrived_at: string;
  assigned_mechanic_id?: string | null;
  customer?: { full_name: string; phone?: string | null } | null;
  motorcycle?: { brand: string; model: string; plate?: string | null } | null;
  mechanic?: { full_name: string } | null;
}

export interface DashboardStats {
  activeOrders: number;
  waitingOrders: number;
  todayCompleted: number;
  todayIncome: number;
  mechanicRecordedTotal: number;
}

export const OWNER_ROLES: MemberRole[] = ['owner', 'owner_mechanic'];
export const WORKER_ROLES: MemberRole[] = ['mechanic', 'owner_mechanic'];
