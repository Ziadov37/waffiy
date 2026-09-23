import { Platform } from 'react-native';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type MerchantRow = Database['public']['Tables']['merchants']['Row'];

export type CardProgram = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  threshold: number;
  stamps: number;
  lifetimeStamps: number;
  rewardsRedeemed: number;
  rewardAvailable: boolean;
  /** Part du chemin parcouru, bornée à 1. Sert au tri et à la barre. */
  ratio: number;
  surfaceColor: string | null;
  borderColor: string | null;
};

export type Card = {
  points: number;
  merchantId: string;
  merchantName: string;
  category: MerchantRow['category'];
  city: string;
  logoUrl: string | null;
  joinedAt: string;
  lastActivityAt: string | null;
  programs: CardProgram[];
  /** Programme mis en avant : le plus proche de sa récompense. */
  primaryProgram: CardProgram | null;
  rewardAvailable: boolean;
  surfaceColor: string | null;
  borderColor: string | null;
};

export type PublicMerchantPreview = {
  merchantId: string;
  merchantName: string;
  category: MerchantRow['category'];
  city: string;
  logoUrl: string | null;
  rewardName: string | null;
  rewardEmoji: string | null;
  rewardDescription: string | null;
  rewardThreshold: number | null;
};

/** Aperçu minimal visible avant connexion depuis le QR HTTPS du commerce. */
export async function fetchPublicMerchant(
  joinCode: string,
): Promise<PublicMerchantPreview | null> {
  const { data, error } = await supabase.rpc('get_public_merchant', {
    p_join_code: joinCode,
  });
  if (error) throw error;

  const merchant = data?.[0];
  if (!merchant) return null;

  return {
    merchantId: merchant.merchant_id,
    merchantName: merchant.merchant_name,
    category: merchant.merchant_category,
    city: merchant.merchant_city,
    logoUrl: merchant.merchant_logo_url,
    rewardName: merchant.reward_name,
    rewardEmoji: merchant.reward_emoji,
    rewardDescription: merchant.reward_description,
    rewardThreshold: merchant.reward_threshold,
  };
}

/** Solde serveur commun au commerce et catalogue complet de ses récompenses. */
export async function fetchCards(): Promise<Card[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return [];
  const [memberships, catalog] = await Promise.all([
    supabase
      .from('memberships')
      .select(
        'merchant_id, joined_at, last_activity_at, points, lifetime_points, rewards_redeemed, merchants(id, name, category, city, logo_url)',
      )
      .eq('profile_id', user.id)
      .order('last_activity_at', { ascending: false, nullsFirst: false }),
    supabase.from('programs').select('*').eq('status', 'active').order('threshold'),
  ]);

  if (memberships.error) throw memberships.error;
  if (catalog.error) throw catalog.error;

  return (memberships.data ?? []).flatMap((row) => {
    const merchant = row.merchants;
    if (!merchant) return [];

    const programs: CardProgram[] = (catalog.data ?? [])
      .filter((program) => program.merchant_id === row.merchant_id)
      .map((program) => ({
        id: program.id,
        name: program.name,
        emoji: program.emoji,
        description: program.description,
        threshold: program.threshold,
        stamps: row.points,
        lifetimeStamps: row.lifetime_points,
        rewardsRedeemed: row.rewards_redeemed,
        rewardAvailable: row.points >= program.threshold,
        ratio: Math.min(row.points / program.threshold, 1),
        surfaceColor: program.surface_color,
        borderColor: program.border_color,
      }));
    const primary = programs[0] ?? null;

    return [
      {
        points: row.points,
        merchantId: merchant.id,
        merchantName: merchant.name,
        category: merchant.category,
        city: merchant.city,
        logoUrl: merchant.logo_url,
        joinedAt: row.joined_at,
        lastActivityAt: row.last_activity_at,
        programs,
        primaryProgram: primary,
        rewardAvailable: programs.some((p) => p.rewardAvailable),
        surfaceColor: primary?.surfaceColor ?? null,
        borderColor: primary?.borderColor ?? null,
      },
    ];
  });
}

export type UsedReward = {
  id: string;
  label: string;
  merchantName: string;
  usedAt: string;
};

/** Historique des récompenses consommées — dérivé du registre, sans table dédiée. */
export async function fetchUsedRewards(): Promise<UsedReward[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('id, reward_label, created_at, merchants(name)')
    .eq('kind', 'redeem')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.reward_label ?? 'Récompense',
    merchantName: row.merchants?.name ?? 'Commerce',
    usedAt: row.created_at,
  }));
}

/** Rejoint un commerce depuis le QR affiché en vitrine. Seule voie d'inscription (D5). */
export async function joinMerchant(joinCode: string) {
  // La page QR web reste volontairement très légère. Sur quelques navigateurs
  // mobiles, la chaîne PostgREST de supabase-js peut rester en attente alors
  // que le même appel HTTP répond immédiatement. Utiliser l'endpoint officiel
  // directement évite ce blocage ; la fonction SQL et la RLS restent les mêmes.
  if (Platform.OS === 'web') {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('UNAUTHENTICATED');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(
        `${env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/join_merchant`,
        {
          method: 'POST',
          headers: {
            apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_join_code: joinCode }),
          signal: controller.signal,
        },
      );
      const payload = (await response.json()) as
        | Database['public']['CompositeTypes']['join_result']
        | { message?: string };
      if (!response.ok) {
        throw new Error('message' in payload ? (payload.message ?? 'JOIN_FAILED') : 'JOIN_FAILED');
      }
      return payload as Database['public']['CompositeTypes']['join_result'];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('NETWORK_TIMEOUT');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  const { data, error } = await supabase.rpc('join_merchant', { p_join_code: joinCode });
  if (error) throw error;
  return data;
}
