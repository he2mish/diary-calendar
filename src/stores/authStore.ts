import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  color: string;
}

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string, color: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (displayName: string, color: string) => Promise<string | null>;
  changePassword: (newPassword: string) => Promise<string | null>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null, session, loading: false });

    if (session?.user) {
      await get().loadProfile();
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ user: session?.user ?? null, session });
      if (session?.user) {
        await get().loadProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  loadProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      set({
        profile: {
          id: data.id,
          email: data.email,
          displayName: data.display_name,
          color: data.color || '#6b7280',
        },
      });
    }
  },

  signUp: async (email, password, displayName, color) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;

    // 프로필 업데이트 (트리거가 기본값으로 생성 후, 이름/색상 업데이트)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        display_name: displayName,
        color,
      });
    }
    return null;
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  },

  updateProfile: async (displayName, color) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '로그인이 필요합니다';
    const { error } = await supabase.from('profiles').update({
      display_name: displayName,
      color,
    }).eq('id', user.id);
    if (error) return error.message;
    await get().loadProfile();
    return null;
  },

  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return error.message;
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },
}));
