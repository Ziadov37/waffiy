import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStorage } from '@/lib/secure-storage';

export type StaffSession = {
  token: string;
  staffId: string;
  staffName: string;
  merchantId: string;
  expiresAt: string;
};

type StaffSessionState = {
  session: StaffSession | null;
  hydrated: boolean;
  setSession: (session: StaffSession) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
};

/** Le jeton de caisse est conservé dans le trousseau/Keystore, jamais dans AsyncStorage. */
export const useStaffSessionStore = create<StaffSessionState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'waffiy.staff-session',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
