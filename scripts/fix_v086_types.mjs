import fs from 'node:fs';

const file = 'src/types.ts';
let source = fs.readFileSync(file, 'utf8');

source = source.replace(
`export interface Appointment {
  id: string;
  workshop_id: string;
  workshop_name: string;
  customer_id: string;
  motorcycle_id: string;
  brand: string;
  model: string;
  plate?: string | null;
  mechanic_id: string;
  mechanic_name: string;
  service_title: string;
  customer_note?: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  cancellation_reason?: string | null;
  created_at: string;
}`,
`export interface Appointment {
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
}`,
);

if (!source.includes('export interface AppointmentEvent')) {
  source += `

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
`;
}

if (!source.includes('export interface WorkOrderListItem')) {
  source += `
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
`;
}

if (!source.includes('export interface DashboardStats')) {
  source += `
export interface DashboardStats {
  activeOrders: number;
  waitingOrders: number;
  todayCompleted: number;
  todayIncome: number;
  mechanicRecordedTotal: number;
}
`;
}

if (!source.includes('export const OWNER_ROLES')) {
  source += `
export const OWNER_ROLES: MemberRole[] = ['owner', 'owner_mechanic'];
export const WORKER_ROLES: MemberRole[] = ['mechanic', 'owner_mechanic'];
`;
}

fs.writeFileSync(file, source);
console.log('Shared v0.8.6 types restored.');
