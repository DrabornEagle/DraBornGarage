import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AccountMode, BusinessApplication, BusinessRegistrationData, CustomerRegistrationMotor, CustomerWorkshopLink, MechanicApplication, MemberRole, Profile, Workshop, WorkshopMember, WorkshopSearchResult } from '../types';

const ACTIVE_WORKSHOP_KEY = '@draborngarage/active-workshop';
const ACTIVE_CUSTOMER_WORKSHOP_KEY = '@draborngarage/customer-active-workshop';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  accountMode: AccountMode;
  workshop: Workshop | null;
  workshops: Workshop[];
  membership: WorkshopMember | null;
  memberships: WorkshopMember[];
  customerWorkshop: CustomerWorkshopLink | null;
  customerWorkshops: CustomerWorkshopLink[];
  businessApplication: BusinessApplication | null;
  mechanicApplications: MechanicApplication[];
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (fullName: string, phone: string, email: string, password: string, accountMode?: AccountMode, customerMotor?: CustomerRegistrationMotor, businessRegistration?: BusinessRegistrationData) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshWorkspace: (preferredWorkshopId?: string | null, preferredCustomerWorkshopId?: string | null) => Promise<void>;
  selectWorkshop: (workshopId: string) => Promise<void>;
  selectCustomerWorkshop: (workshopId: string) => Promise<void>;
  setAccountMode: (mode: AccountMode) => Promise<string | null>;
  createWorkshop: (name: string, phone: string, address: string, taxOffice: string, taxNumber: string) => Promise<string | null>;
  joinWorkshop: (code: string) => Promise<string | null>;
  searchWorkshops: (query: string) => Promise<{ data: WorkshopSearchResult[]; error?: string }>;
  applyAsMechanic: (workshopId: string, note?: string) => Promise<string | null>;
  createInviteCode: (role: MemberRole) => Promise<{ code?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const WORKSHOP_COLUMNS = 'id, name, phone, address, logo_url, is_active, demo_batch_id, timezone, appointments_enabled, appointment_auto_confirm, appointment_booking_days, appointment_min_notice_minutes, tax_office, tax_number';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [memberships, setMemberships] = useState<WorkshopMember[]>([]);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [membership, setMembership] = useState<WorkshopMember | null>(null);
  const [customerWorkshops, setCustomerWorkshops] = useState<CustomerWorkshopLink[]>([]);
  const [customerWorkshop, setCustomerWorkshop] = useState<CustomerWorkshopLink | null>(null);
  const [businessApplication, setBusinessApplication] = useState<BusinessApplication | null>(null);
  const [mechanicApplications, setMechanicApplications] = useState<MechanicApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const clearState = useCallback(() => {
    setProfile(null);
    setWorkshops([]);
    setMemberships([]);
    setWorkshop(null);
    setMembership(null);
    setCustomerWorkshops([]);
    setCustomerWorkshop(null);
    setBusinessApplication(null);
    setMechanicApplications([]);
  }, []);

  const refreshWorkspace = useCallback(async (
    preferredWorkshopId?: string | null,
    preferredCustomerWorkshopId?: string | null,
  ) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentSession = sessionData.session;
    setSession(currentSession);

    if (!currentSession?.user) {
      clearState();
      setLoading(false);
      return;
    }

    const userId = currentSession.user.id;
    const [{ data: profileData, error: profileError }, { data: memberData }, customerWorkshopResult, { data: applicationData }, mechanicApplicationResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, avatar_url, is_admin, account_mode, customer_plate, customer_motorcycle_brand, customer_motorcycle_model').eq('id', userId).maybeSingle(),
      supabase
        .from('workshop_members')
        .select('workshop_id, user_id, role, is_active, availability_status, staff_note')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true }),
      supabase.rpc('customer_get_workshops'),
      supabase.from('business_applications').select('id,user_id,business_name,business_phone,business_address,tax_office,tax_number,status,submitted_at,reviewed_at,review_note,workshop_id').eq('user_id', userId).maybeSingle(),
      supabase.rpc('customer_get_mechanic_applications'),
    ]);

    if (!profileError && !profileData) {
      await supabase.auth.signOut({ scope: 'local' });
      setSession(null);
      clearState();
      setLoading(false);
      return;
    }

    const nextProfile = (profileData as Profile | null) ?? null;
    const nextMemberships = (memberData as WorkshopMember[]) ?? [];
    const admin = Boolean(nextProfile?.is_admin);
    setProfile(nextProfile);
    setMemberships(nextMemberships);
    setBusinessApplication((applicationData as BusinessApplication | null) ?? null);
    setMechanicApplications((mechanicApplicationResult.data as MechanicApplication[] | null) ?? []);

    let nextWorkshops: Workshop[] = [];
    if (admin) {
      const { data } = await supabase.from('workshops').select(WORKSHOP_COLUMNS).order('created_at', { ascending: true });
      nextWorkshops = (data as Workshop[]) ?? [];
    } else if (nextMemberships.length > 0) {
      const ids = nextMemberships.map((item) => item.workshop_id);
      const { data } = await supabase.from('workshops').select(WORKSHOP_COLUMNS).in('id', ids).eq('is_active', true).order('created_at', { ascending: true });
      nextWorkshops = (data as Workshop[]) ?? [];
    }
    setWorkshops(nextWorkshops);

    const storedStaffId = preferredWorkshopId ?? await AsyncStorage.getItem(ACTIVE_WORKSHOP_KEY);
    const selectedStaff = nextWorkshops.find((item) => item.id === storedStaffId)
      ?? nextWorkshops.find((item) => item.is_active !== false)
      ?? nextWorkshops[0]
      ?? null;
    if (selectedStaff) await AsyncStorage.setItem(ACTIVE_WORKSHOP_KEY, selectedStaff.id);
    setWorkshop(selectedStaff);

    const selectedMembership = selectedStaff
      ? nextMemberships.find((item) => item.workshop_id === selectedStaff.id) ?? (admin ? {
          workshop_id: selectedStaff.id,
          user_id: userId,
          role: 'owner' as MemberRole,
          is_active: true,
          availability_status: 'available' as const,
        } : null)
      : null;
    setMembership(selectedMembership);

    const nextCustomerWorkshops = ((customerWorkshopResult.data as CustomerWorkshopLink[] | null) ?? []);
    setCustomerWorkshops(nextCustomerWorkshops);
    const storedCustomerId = preferredCustomerWorkshopId ?? await AsyncStorage.getItem(ACTIVE_CUSTOMER_WORKSHOP_KEY);
    const selectedCustomer = nextCustomerWorkshops.find((item) => item.workshop_id === storedCustomerId)
      ?? nextCustomerWorkshops[0]
      ?? null;
    if (selectedCustomer) await AsyncStorage.setItem(ACTIVE_CUSTOMER_WORKSHOP_KEY, selectedCustomer.workshop_id);
    setCustomerWorkshop(selectedCustomer);
    setLoading(false);
  }, [clearState]);

  useEffect(() => {
    refreshWorkspace();
    const { data } = supabase.auth.onAuthStateChange(() => refreshWorkspace());
    return () => data.subscription.unsubscribe();
  }, [refreshWorkspace]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const channel = supabase.channel(`workspace-access-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_applications', filter: `user_id=eq.${userId}` }, () => refreshWorkspace())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mechanic_applications', filter: `user_id=eq.${userId}` }, () => refreshWorkspace())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => refreshWorkspace())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshop_members', filter: `user_id=eq.${userId}` }, () => refreshWorkspace())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user.id, refreshWorkspace]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    accountMode: profile?.account_mode ?? 'customer',
    workshop,
    workshops,
    membership,
    memberships,
    customerWorkshop,
    customerWorkshops,
    businessApplication,
    mechanicApplications,
    isAdmin: Boolean(profile?.is_admin),
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return error.message;
      await refreshWorkspace();
      return null;
    },
    signUp: async (fullName, phone, email, password, accountMode = 'customer', customerMotor, businessRegistration) => {
      const customerData = accountMode === 'customer' && customerMotor ? {
        customer_plate: customerMotor.plate.trim().toUpperCase(),
        customer_motorcycle_brand: customerMotor.brand.trim(),
        customer_motorcycle_model: customerMotor.model.trim(),
      } : {};
      const businessData = accountMode === 'staff' && businessRegistration ? {
        business_name: businessRegistration.business_name.trim(),
        business_phone: businessRegistration.business_phone?.trim() || phone.trim() || null,
        business_address: businessRegistration.business_address?.trim() || null,
        business_tax_office: businessRegistration.tax_office.trim(),
        business_tax_number: businessRegistration.tax_number.replace(/\D/g, ''),
      } : {};
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim(), phone: phone.trim(), requested_account_mode: accountMode, account_mode: 'customer', ...customerData, ...businessData } },
      });
      if (error) return error.message;
      if (!data.session) return 'Hesabın oluşturuldu. E-posta doğrulamasını tamamladıktan sonra giriş yap.';
      await refreshWorkspace();
      return null;
    },
    signOut: async () => {
      await supabase.auth.signOut();
      await Promise.all([AsyncStorage.removeItem(ACTIVE_WORKSHOP_KEY), AsyncStorage.removeItem(ACTIVE_CUSTOMER_WORKSHOP_KEY)]);
      setSession(null);
      clearState();
    },
    refreshWorkspace,
    selectWorkshop: async (workshopId) => {
      await AsyncStorage.setItem(ACTIVE_WORKSHOP_KEY, workshopId);
      await refreshWorkspace(workshopId, customerWorkshop?.workshop_id ?? null);
    },
    selectCustomerWorkshop: async (workshopId) => {
      await AsyncStorage.setItem(ACTIVE_CUSTOMER_WORKSHOP_KEY, workshopId);
      await refreshWorkspace(workshop?.id ?? null, workshopId);
    },
    setAccountMode: async (mode) => {
      const { error } = await supabase.rpc('set_profile_account_mode', { p_mode: mode });
      if (error) return error.message;
      await refreshWorkspace(workshop?.id ?? null, customerWorkshop?.workshop_id ?? null);
      return null;
    },
    createWorkshop: async (name, phone, address, taxOffice, taxNumber) => {
      const rpcName = profile?.is_admin ? 'admin_create_workshop' : 'create_workshop';
      const { data, error } = await supabase.rpc(rpcName, {
        p_name: name.trim(),
        p_phone: phone.trim() || null,
        p_address: address.trim() || null,
        p_tax_office: taxOffice.trim(),
        p_tax_number: taxNumber.replace(/\D/g, ''),
      });
      if (error) return error.message;
      await supabase.rpc('set_profile_account_mode', { p_mode: 'staff' });
      await refreshWorkspace(data ? String(data) : null, customerWorkshop?.workshop_id ?? null);
      return null;
    },
    joinWorkshop: async (code) => {
      const { data, error } = await supabase.rpc('join_workshop_by_code', { p_code: code.trim().toUpperCase() });
      if (error) return error.message;
      await refreshWorkspace(data ? String(data) : null, customerWorkshop?.workshop_id ?? null);
      return null;
    },
    searchWorkshops: async (query) => {
      const { data, error } = await supabase.rpc('search_active_workshops', { p_query: query.trim() });
      return error
        ? { data: [], error: error.message }
        : { data: (data as WorkshopSearchResult[] | null) ?? [] };
    },
    applyAsMechanic: async (workshopId, note = '') => {
      const { error } = await supabase.rpc('submit_mechanic_application', {
        p_workshop_id: workshopId,
        p_note: note.trim() || null,
      });
      if (error) return error.message;
      await refreshWorkspace(workshop?.id ?? null, customerWorkshop?.workshop_id ?? null);
      return null;
    },
    createInviteCode: async (role) => {
      if (!workshop) return { error: 'Aktif işletme bulunamadı.' };
      const { data, error } = await supabase.rpc('create_workshop_invite', { p_workshop_id: workshop.id, p_role: role, p_expires_in_days: 30 });
      if (error) return { error: error.message };
      return { code: String(data) };
    },
  }), [session, profile, workshop, workshops, membership, memberships, customerWorkshop, customerWorkshops, businessApplication, mechanicApplications, loading, refreshWorkspace, clearState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
