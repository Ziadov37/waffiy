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

/**
 * Les cartes du client connecté.
 *
 * Deux requêtes plutôt qu'une jointure : program_progress n'a pas de clé
 * étrangère vers memberships — les deux tables pointent vers profiles et
 * merchants sans relation directe. PostgREST ne peut donc pas les imbriquer,
 * et les fusionner ici coûte moins qu'une vue supplémentaire à maintenir.
 *
 * La RLS limite déjà les deux requêtes au client connecté : aucun filtre par
 * identifiant n'est nécessaire, et en ajouter un donnerait la fausse
 * impression que c'est lui qui protège les données.
 */
export async function fetchCards(): Promise<Card[]> {
  const [memberships, progress] = await Promise.all([
    supabase
      .from('memberships')
      .select('merchant_id, joined_at, last_activity_at, merchants(id, name, category, city, logo_url)')
      .order('last_activity_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('program_progress')
      .select(
        'merchant_id, stamps, lifetime_stamps, rewards_redeemed, programs(id, name, emoji, description, threshold, status, surface_color, border_color, sort_order)',
      ),
  ]);

  if (memberships.error) throw memberships.error;
  if (progress.error) throw progress.error;

  const byMerchant = new Map<string, CardProgram[]>();

  for (const row of progress.data ?? []) {
    const program = row.programs;
    // Un programme archivé garde son solde mais ne s'affiche plus au client :
    // le commerçant ne le propose plus.
    if (!program || program.status !== 'active') continue;

    const list = byMerchant.get(row.merchant_id) ?? [];
    list.push({
      id: program.id,
      name: program.name,
      emoji: program.emoji,
      description: program.description,
      threshold: program.threshold,
      stamps: row.stamps,
      lifetimeStamps: row.lifetime_stamps,
      rewardsRedeemed: row.rewards_redeemed,
      rewardAvailable: row.stamps >= program.threshold,
      ratio: Math.min(row.stamps / program.threshold, 1),
      surfaceColor: program.surface_color,
      borderColor: program.border_color,
    });
    byMerchant.set(row.merchant_id, list);
  }

  return (memberships.data ?? []).flatMap((row) => {
    const merchant = row.merchants;
    if (!merchant) return [];

    const programs = (byMerchant.get(row.merchant_id) ?? []).sort(
      (a, b) => b.ratio - a.ratio || b.stamps - a.stamps || a.name.localeCompare(b.name, 'fr'),
    );
    const primary = programs[0] ?? null;

    return [
      {
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
  const { data, error } = await supabase
    .from('transactions')
    .select('id, reward_label, created_at, merchants(name)')
    .eq('kind', 'redeem')
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
  const { data, error } = await supabase.rpc('join_merchant', { p_join_code: joinCode });
  if (error) throw error;
  return data;
}
