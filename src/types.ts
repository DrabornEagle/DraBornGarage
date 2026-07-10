export type ThemeMode = 'system' | 'light' | 'dark' | 'carbon' | 'racing' | 'electric' | 'sunset';
export type AccountMode = 'staff' | 'customer';
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
export type CustomerClaimMethod = 'phone' | 'tracking_code' | 'qr' | 'mechanic_approval' | 'staff_manual';
export type CustomerClaimStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_admin?: boolean;
  account_mode?: AccountMode;
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

export interface CustomerWorkshopLink {
  link_id: string;
  workshop_id: string;
  workshop_name: string;
  workshop_phone?: string | null;
  workshop_address?: string | null;
  customer_id: string;
  customer_name: string;
  linked_at?: string | null;
  link_method: CustomerClaimMethod;
}

export interface CustomerMotorcycle {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  year?: number | null;
  plate?: string | null;
  color?: string | null;
  odometer?: number | null;
  service_count: number;
  active_service_count: number;
  last_service_at?: string | null;
  latest_status?: WorkOrderStatus | null;
}

export interface CustomerServiceItem {
  title: string;
  price: number;
  completed: boolean;
}

export interface CustomerServiceRecord {
  id: string;
  workshop_id: string;
  workshop_name: string;
  motorcycle_id: string;
  brand: string;
  model: string;
  plate?: string | null;
  status: WorkOrderStatus;
  service_type: ServiceType;
  complaint: string;
  price_type?: PriceType | null;
  estimated_price_min?: number | null;
  estimated_price_max?: number | null;
  quoted_price?: number | null;
  total_amount: number;
  amount_received: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  arrived_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  service_items: CustomerServiceItem[];
}

export interface CustomerClaim {
  id: string;
  workshop_id: string;
  workshop_name: string;
  motorcycle_id: string;
  brand: string;
  model: string;
  plate?: string | null;
  method: CustomerClaimMethod;
  status: CustomerClaimStatus;
  created_at: string;
  reviewed_at?: string | null;
  review_note?: string | null;
}

export interface StaffCustomerClaim {
  id: string;
  user_id: string;
  claimant_name: string;
  claimant_phone?: string | null;
  customer_id: string;
  customer_name: string;
  motorcycle_id: string;
  brand: string;
  model: string;
  plate?: string | null;
  method: CustomerClaimMethod;
  status: CustomerClaimStatus;
  submitted_phone?: string | null;
  created_at: string;
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
