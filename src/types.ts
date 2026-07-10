export type ThemeMode = 'system' | 'light' | 'dark';
export type MemberRole = 'owner' | 'mechanic';
export type WorkOrderStatus = 'waiting' | 'in_progress' | 'completed' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Profile {
  id: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface Workshop {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
}

export interface WorkshopMember {
  workshop_id: string;
  user_id: string;
  role: MemberRole;
  is_active: boolean;
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
  status: WorkOrderStatus;
  payment_status: PaymentStatus;
  complaint: string;
  total_amount: number;
  amount_received: number;
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
