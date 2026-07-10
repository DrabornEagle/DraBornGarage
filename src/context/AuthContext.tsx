import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { MemberRole, Profile, Workshop, WorkshopMember } from '../types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  workshop: Workshop | null;
  membership: WorkshopMember | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (fullName: string, phone: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  createWorkshop: (name: string, phone: string, address: string) => Promise<string | null>;
  joinWorkshop: (code: string) => Promise<string | null>;
  createInviteCode: (role: MemberRole) => Promise<{ code?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [membership, setMembership] = useState<WorkshopMember | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspace = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentSession = sessionData.session;
    setSession(currentSession);

    if (!currentSession?.user) {
      setProfile(null);
      setWorkshop(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    const userId = currentSession.user.id;
    const [{ data: profileData }, { data: memberData }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, avatar_url').eq('id', userId).maybeSingle(),
      supabase
        .from('workshop_members')
        .select('workshop_id, user_id, role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    setProfile((profileData as Profile | null) ?? null);
    setMembership((memberData as WorkshopMember | null) ?? null);

    if (memberData?.workshop_id) {
      const { data: workshopData } = await supabase
        .from('workshops')
        .select('id, name, phone, address, logo_url')
        .eq('id', memberData.workshop_id)
        .single();
      setWorkshop((workshopData as Workshop | null) ?? null);
    } else {
      setWorkshop(null);
    }
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
      membership,
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
        setSession(null);
        setProfile(null);
        setWorkshop(null);
        setMembership(null);
      },
      refreshWorkspace,
      createWorkshop: async (name, phone, address) => {
        const { error } = await supabase.rpc('create_workshop', {
          p_name: name.trim(),
          p_phone: phone.trim() || null,
          p_address: address.trim() || null,
        });
        if (error) return error.message;
        await refreshWorkspace();
        return null;
      },
      joinWorkshop: async (code) => {
        const { error } = await supabase.rpc('join_workshop_by_code', { p_code: code.trim().toUpperCase() });
        if (error) return error.message;
        await refreshWorkspace();
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
    [session, profile, workshop, membership, loading, refreshWorkspace],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
