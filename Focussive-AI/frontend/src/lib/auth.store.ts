'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch, ApiError } from './api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  settings: { assistantPersonality: string; burnoutThresholdScore: number; workStartHour: number; workEndHour: number } | null;
  gamification: { currentLevel: number; currentXP: number; streakDays: number } | null;
}

type State = {
  accessToken: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (e: string, p: string) => Promise<void>;
  register: (e: string, p: string, n: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshMe: () => Promise<void>;
};

async function authCall(path: string, body: object): Promise<{ accessToken: string; user: User }> {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body), skipAuth: true });
}

export const useAuthStore = create<State>()(persist((set, get) => ({
  accessToken: null,
  user: null,
  loading: false,
  error: null,
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { accessToken, user } = await authCall('/auth/login', { email, password });
      set({ accessToken, user, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof ApiError ? e.message : 'Login failed' });
      throw e;
    }
  },
  register: async (email, password, fullName) => {
    set({ loading: true, error: null });
    try {
      const { accessToken, user } = await authCall('/auth/register', { email, password, fullName });
      set({ accessToken, user, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof ApiError ? e.message : 'Registration failed' });
      throw e;
    }
  },
  logout: () => set({ accessToken: null, user: null, error: null }),
  clearError: () => set({ error: null }),
  refreshMe: async () => {
    if (!get().accessToken) return;
    try {
      set({ user: await apiFetch('/auth/me') });
    } catch {
      set({ accessToken: null, user: null });
    }
  },
}), { name: 'focussive-auth', partialize: s => ({ accessToken: s.accessToken, user: s.user }) }));