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
export type AppointmentStatus = 'pending' | 'confirmed' | 'arrived' | 'converted' | 'cancelled' | 'no_show';
export type AppointmentSource = 'customer' | 'mechanic' | 'owner' | 'admin';
export type ExtraWorkStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ExtraApprovalMethod = 'app' | 'in_person' | 'phone' | 'whatsapp' | 'staff_rejected';
export type WorkNoteVisibility = 'staff' | 'customer';
export type WorkNoteCategory = 'general' | 'diagnosis' | 'test' | 'customer_update' | 'internal';
export type ReceivableStatus = 'not_set' | 'open' | 'closed' | 'cancelled';
export type ReceivableVisibility = 'staff' | 'customer';

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
  timezone?: string;
  appointments_enabled?: boolean;
  appointment_auto_confirm?: boolean;
  appointment_booking_days?: number;
  appointment_min_notice_minutes?: number;
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
  id?: string;
  title: string;
  description?: string | null;
  price: number;
  completed: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  extra_request_id?: string | null;
  included_in_total?: boolean;
}

export interface CustomerServicePart {
  id: string;
  part_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  used_at?: string | null;
  extra_request_id?: string | null;
  included_in_total?: boolean;
}

export interface ExtraWorkRequest {
  id: string;
  work_order_id?: string;
  workshop_id?: string;
  title: string;
  description?: string | null;
  labor_amount: number;
  parts_amount: number;
  total_amount: number;
  status: ExtraWorkStatus;
  approval_method?: ExtraApprovalMethod | null;
  resume_status?: WorkOrderStatus;
  response_note?: string | null;
  responded_at?: string | null;
  created_at: string;
  can_respond?: boolean;
}

export interface WorkOrderNote {
  id: string;
  work_order_id?: string;
  category: WorkNoteCategory;
  visibility?: WorkNoteVisibility;
  note: string;
  author_id?: string;
  author_name?: string | null;
  created_at: string;
}

export interface WorkOrderEvent {
  id: string;
  work_order_id?: string;
  event_type: string;
  actor_id?: string | null;
  actor_name?: string | null;
  old_status?: WorkOrderStatus | null;
  new_status?: WorkOrderStatus | null;
  note?: string | null;
  created_at: string;
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
  receivable_status?: ReceivableStatus;
  debt_promised_date?: string | null;
  debt_written_at?: string | null;
  debt_closed_at?: string | null;
  debt_customer_note?: string | null;
  last_payment_at?: string | null;
  arrived_at: string;
  started_at?: string | null;
  testing_started_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  pending_approval_count: number;
  service_items: CustomerServiceItem[];
}

export interface CustomerServiceDetail extends CustomerServiceRecord {
  diagnosis?: string | null;
  labor_amount: number;
  parts_amount: number;
  services: CustomerServiceItem[];
  parts: CustomerServicePart[];
  extra_requests: ExtraWorkRequest[];
  notes: WorkOrderNote[];
  events: WorkOrderEvent[];
  payments?: CustomerPaymentRecord[];
  receivable_notes?: CustomerReceivableNote[];
}

export interface CustomerPaymentRecord {
  id: string;
  amount: number;
  payment_method: PaymentMethod;
  note?: string | null;
  paid_at: string;
}

export interface CustomerReceivableNote {
  id: string;
  note: string;
  created_at: string;
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

export interface AppointmentMechanic {
  mechanic_id: string;
  full_name: string;
  role?: string;
  availability_status: AvailabilityStatus;
}

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  slot_label: string;
}

export interface WorkingHours {
  id: string;
  mechanic_id: string;
  mechanic_name: string;
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
  slot_minutes: number;
}

export interface MechanicTimeOff {
  id: string;
  mechanic_id: string;
  mechanic_name: string;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  workshop_id: string;
  workshop_name?: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string | null;
  motorcycle_id: string;
  brand: string;
  model: string;
  plate?: string | null;
  mechanic_id: string;
  mechanic_name: string;
  service_title: string;
  customer_note?: string | null;
  staff_note?: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  cancellation_reason?: string | null;
  work_order_id?: string | null;
  created_at: string;
}

export interface AppointmentEvent {
  id: string;
  event_type: string;
  actor_name?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  old_start?: string | null;
  new_start?: string | null;
  note?: string | null;
  created_at: string;
}

export interface WorkOrderListItem {
  id: string;
  workshop_id?: string;
  appointment_id?: string | null;
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
