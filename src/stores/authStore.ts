import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  color: string;
  isAdmin: boolean;
}

// 아이디 → 내부 이메일 변환
function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@nyodiary.app`;
}

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signUp: (username: string, password: string, displayName: string, color: string) => Promise<string | null>;
  signIn: (username: string, password: string) => Promise<string | null>;
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
          username: data.username || '',
          displayName: data.display_name || '',
          color: data.color || '#6b7280',
          isAdmin: data.is_admin || false,
        },
      });
    }
  },

  signUp: async (username, password, displayName, color) => {
    // 아이디 유효성 검사
    const trimmed = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      return '아이디는 3~20자 영문 소문자, 숫자, _만 사용 가능합니다';
    }

    // 아이디 중복 체크
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmed)
      .single();
    if (existing) return '이미 사용 중인 아이디입니다';

    const email = usernameToEmail(trimmed);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        username: trimmed,
        display_name: displayName,
        color,
        is_admin: false,
      });
    }
    return null;
  },

  signIn: async (username, password) => {
    const trimmed = username.trim().toLowerCase();
    const email = usernameToEmail(trimmed);

    // 삭제된 사용자 체크
    const { data: prof } = await supabase
      .from('profiles')
      .select('deleted')
      .eq('username', trimmed)
      .single();
    if (prof?.deleted) return '비활성화된 계정입니다. 관리자에게 문의하세요';

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return '아이디 또는 비밀번호가 올바르지 않습니다';
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
