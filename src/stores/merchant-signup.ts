import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MerchantStepValues, ProgramStepValues } from '@/features/auth/schemas';

type MerchantSignupState = {
  commerce: MerchantStepValues | null;
  program: ProgramStepValues | null;
  setCommerce: (value: MerchantStepValues) => void;
  setProgram: (value: ProgramStepValues) => void;
  clear: () => void;
};

/**
 * Brouillon d'inscription commerçant.
 *
 * Persisté volontairement : le parcours fait trois étapes puis un aller-retour
 * vers l'application de messagerie pour relever le code. Sur un téléphone à
 * faible mémoire, Android peut tuer Waffiy pendant cette absence — sans
 * persistance, le commerçant retrouverait un formulaire vide après avoir tout
 * ressaisi.
 */
export const useMerchantSignupStore = create<MerchantSignupState>()(
  persist(
    (set) => ({
      commerce: null,
      program: null,
      setCommerce: (commerce) => set({ commerce }),
      setProgram: (program) => set({ program }),
      clear: () => set({ commerce: null, program: null }),
    }),
    {
      name: 'waffiy.merchant-signup-draft',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
