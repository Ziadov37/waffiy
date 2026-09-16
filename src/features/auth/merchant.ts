import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

import type { MerchantStepValues, ProgramStepValues } from './schemas';

export type CreateMerchantInput = {
  commerce: MerchantStepValues;
  program: ProgramStepValues;
};

/**
 * Crée le commerce et son premier programme.
 *
 * Passe par la fonction serveur create_merchant() plutôt que par deux
 * insertions : une coupure entre les deux laisserait un commerce sans
 * programme, donc un commerçant incapable de créditer et sans écran pour
 * comprendre pourquoi.
 */
export async function createMerchant({ commerce, program }: CreateMerchantInput) {
  const { data, error } = await supabase.rpc('create_merchant', {
    p_name: commerce.name,
    p_category: commerce.category,
    p_city: commerce.city,
    p_program_name: program.name,
    p_threshold: program.threshold,
    ...(commerce.phone ? { p_phone: commerce.phone } : {}),
    ...(commerce.logoUrl ? { p_logo_url: commerce.logoUrl } : {}),
    p_program_emoji: program.emoji,
    ...(program.description ? { p_program_description: program.description } : {}),
  });

  if (error) throw error;
  return data as Database['public']['Tables']['merchants']['Row'];
}
