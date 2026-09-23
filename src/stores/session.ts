import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppRole = 'client' | 'merchant';

type SessionState = {
  /** Session Supabase. Sa source de vérité reste supabase.auth, pas ce store. */
  session: Session | null;
  /** Faux tant que la session persistée n'a pas été relue : évite un clignotement
   *  vers l'écran d'accueil au lancement d'un utilisateur déjà connecté. */
  hydrated: boolean;
  /** Rôle affiché. Le rôle n'est PAS une propriété du compte (décision D2) :
   *  c'est un point de vue, qu'un compte possédant un commerce peut changer. */
  activeRole: AppRole;
  /** Commerce ouvert depuis un QR public, conservé pendant l'authentification. */
  pendingJoinCode: string | null;
  setSession: (session: Session | null) => void;
  setHydrated: (value: boolean) => void;
  setActiveRole: (role: AppRole) => void;
  setPendingJoinCode: (code: string | null) => void;
  reset: () => void;
};

/**
 * Zustand est délibérément mince : il ne porte que ce qui n'est ni une donnée
 * serveur (TanStack Query) ni la session elle-même (Supabase). Y recopier des
 * soldes ou des listes de clients créerait une seconde source de vérité,
 * vouée à diverger de la première.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      activeRole: 'client',
      pendingJoinCode: null,
      setSession: (session) => set({ session }),
      setHydrated: (hydrated) => set({ hydrated }),
      setActiveRole: (activeRole) => set({ activeRole }),
      setPendingJoinCode: (pendingJoinCode) => set({ pendingJoinCode }),
      reset: () => set({ session: null, activeRole: 'client', pendingJoinCode: null }),
    }),
    {
      name: 'waffiy.session-ui',
      storage: createJSONStorage(() => AsyncStorage),
      // La session n'est PAS persistée ici : elle vit dans le stockage chiffré
      // de Supabase. Ne persister que la préférence d'affichage.
      partialize: (state) => ({
        activeRole: state.activeRole,
        pendingJoinCode: state.pendingJoinCode,
      }),
    },
  ),
);
