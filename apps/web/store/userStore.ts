import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/lib/api/users';

interface UserState {
  accessToken: string | null;
  user: UserProfile | null;
  _hasHydrated: boolean;
  setToken: (token: string) => void;
  setUser: (user: UserProfile) => void;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      _hasHydrated: false,
      setToken: (token) => set({ accessToken: token, user: null }),
      setUser: (user) => set({ user }),
      setAuth: (token, user) => set({ accessToken: token, user }),
      logout: () => set({ accessToken: null, user: null }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'user',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
