import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MemberRole, Profile, Workshop, WorkshopMember } from '../types';

const ACTIVE_WORKSHOP_KEY = '@draborngarage/active-workshop';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  workshop: Workshop | null;
  workshops: Workshop[];
  membership: WorkshopMember | null;
  memberships: WorkshopMember[];
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (fullName: string, phone: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshWorkspace: (preferredWorkshopId?: string | null) => Promise<void>;
  selectWorkshop: (workshopId: string) => Promise<void>;
  createWorkshop: (name: string, phone: string, address: string) => Promise<string | null>;
  joinWorkshop: (code: string) => Promise<string | null>;
  createInviteCode: (role: MemberRole) => Promise<{ code?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [memberships, setMemberships] = useState<WorkshopMember[]>([]);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [membership, setMembership] = useState<WorkshopMember | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspace = useCallback(async (preferredWorkshopId?: string | null) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentSession = sessionData.session;
    setSession(currentSession);

    if (!currentSession?.user) {
      setProfile(null);
      setWorkshops([]);
      setMemberships([]);
      setWorkshop(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    const userId = currentSession.user.id;
    const [{ data: profileData }, { data: memberData }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, avatar_url, is_admin').eq('id', userId).maybeSingle(),
      supabase
        .from('workshop_members')
        .select('workshop_id, user_id, role, is_active, availability_status, staff_note')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true }),
    ]);

    const nextProfile = (profileData as Profile | null) ?? null;
    const nextMemberships = (memberData as WorkshopMember[]) ?? [];
    const admin = Boolean(nextProfile?.is_admin);
    setProfile(nextProfile);
    setMemberships(nextMemberships);

    let workshopQuery = supabase
      .from('workshops')
      .select('id, name, phone, address, logo_url, is_active, demo_batch_id')
      .order('created_at', { ascending: true });

    if (!admin) {
      const ids = nextMemberships.map((item) => item.workshop_id);
      if (ids.length === 0) {
        setWorkshops([]);
        setWorkshop(null);
        setMembership(null);
        setLoading(false);
        return;
      }
      workshopQuery = workshopQuery.in('id', ids).eq('is_active', true);
    }

    const { data: workshopData } = await workshopQuery;
    const nextWorkshops = ((workshopData as Workshop[]) ?? []).filter((item) => admin || item.is_active !== false);
    setWorkshops(nextWorkshops);

    const storedId = preferredWorkshopId ?? await AsyncStorage.getItem(ACTIVE_WORKSHOP_KEY);
    const selected = nextWorkshops.find((item) => item.id === storedId)
      ?? nextWorkshops.find((item) => item.is_active !== false)
      ?? nextWorkshops[0]
      ?? null;

    if (selected) await AsyncStorage.setItem(ACTIVE_WORKSHOP_KEY, selected.id);
    setWorkshop(selected);

    const selectedMembership = selected
      ? nextMemberships.find((item) => item.workshop_id === selected.id) ?? (admin ? {
          workshop_id: selected.id,
          user_id: userId,
          role: 'owner' as MemberRole,
          is_active: true,
          availability_status: 'available' as const,
        } : null)
      : null;
    setMembership(selectedMembership);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshWorkspace();
    const { data } = supabase.auth.onAuthStateChange(() => refreshWorkspace());
    return () => data.subscription.unsubscribe();
  }, [refreshWorkspace]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      workshop,
      workshops,
      membership,
      memberships,
      isAdmin: Boolean(profile?.is_admin),
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return error.message;
        await refreshWorkspace();
        return null;
      },
      signUp: async (fullName, phone, email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), phone: phone.trim() } },
        });
        if (error) return error.message;
        if (!data.session) return 'Hesabın oluşturuldu. E-posta doğrulamasını tamamladıktan sonra giriş yap.';
        await refreshWorkspace();
        return null;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem(ACTIVE_WORKSHOP_KEY);
        setSession(null);
        setProfile(null);
        setWorkshops([]);
        setMemberships([]);
        setWorkshop(null);
        setMembership(null);
      },
      refreshWorkspace,
      selectWorkshop: async (workshopId) => {
        await AsyncStorage.setItem(ACTIVE_WORKSHOP_KEY, workshopId);
        await refreshWorkspace(workshopId);
      },
      createWorkshop: async (name, phone, address) => {
        const admin = Boolean(profile?.is_admin);
        const rpcName = admin ? 'admin_create_workshop' : 'create_workshop';
        const { data, error } = await supabase.rpc(rpcName, {
          p_name: name.trim(),
          p_phone: phone.trim() || null,
          p_address: address.trim() || null,
        });
        if (error) return error.message;
        await refreshWorkspace(data ? String(data) : null);
        return null;
      },
      joinWorkshop: async (code) => {
        const { data, error } = await supabase.rpc('join_workshop_by_code', { p_code: code.trim().toUpperCase() });
        if (error) return error.message;
        await refreshWorkspace(data ? String(data) : null);
        return null;
      },
      createInviteCode: async (role) => {
        if (!workshop) return { error: 'Aktif işletme bulunamadı.' };
        const { data, error } = await supabase.rpc('create_workshop_invite', {
          p_workshop_id: workshop.id,
          p_role: role,
          p_expires_in_days: 30,
        });
        if (error) return { error: error.message };
        return { code: String(data) };
      },
    }),
    [session, profile, workshop, workshops, membership, memberships, loading, refreshWorkspace],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
