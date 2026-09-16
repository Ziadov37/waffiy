import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Merchant = Database['public']['Tables']['merchants']['Row'];
export type MerchantCategory = Database['public']['Enums']['merchant_category'];

export type SignUpMetadata = {
  firstName: string;
  lastName: string;
  phone?: string;
};

/**
 * Envoie un code à 6 chiffres par email (décision D1 : pas de mot de passe).
 *
 * `shouldCreateUser` distingue inscription et connexion. Sans ce drapeau, une
 * faute de frappe à la connexion créerait silencieusement un compte vide, et
 * l'utilisateur se demanderait où sont passées ses cartes.
 */
export async function requestEmailCode(
  email: string,
  options: { createUser: boolean; metadata?: SignUpMetadata },
): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: options.createUser,
      ...(options.metadata
        ? {
            data: {
              first_name: options.metadata.firstName,
              last_name: options.metadata.lastName,
              ...(options.metadata.phone ? { phone: options.metadata.phone } : {}),
            },
          }
        : {}),
    },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Le commerce exploité par le compte connecté, s'il en a un.
 *
 * C'est cette requête, et elle seule, qui détermine si l'utilisateur peut
 * basculer en mode commerçant (décision D2 : le rôle est une capacité dérivée,
 * pas une colonne). La RLS la restreint déjà au commerce dont il est
 * propriétaire — le filtre explicite ne sert qu'à la lisibilité.
 */
export async function fetchMyMerchant(userId: string): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  patch: Database['public']['Tables']['profiles']['Update'],
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
