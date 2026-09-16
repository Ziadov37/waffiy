import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Program = Database['public']['Tables']['programs']['Row'];
export type ProgramStatus = Database['public']['Enums']['program_status'];
export type ActivityRow = Database['public']['Views']['merchant_activity']['Row'];
export type CustomerRow = Database['public']['Views']['merchant_customers']['Row'];
export type MerchantStats = {
  customersCount: number;
  scansToday: number;
  rewardsThisMonth: number;
  returningRate: number;
};

export async function fetchPrograms(merchantId: string): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('merchant_id', merchantId)
    .neq('status', 'archived')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Nombre de clients ayant une progression sur chaque programme, pour la liste. */
export async function fetchProgramMemberCounts(
  merchantId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('program_progress')
    .select('program_id')
    .eq('merchant_id', merchantId);
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.program_id] = (counts[row.program_id] ?? 0) + 1;
  }
  return counts;
}

export async function fetchStats(merchantId: string): Promise<MerchantStats> {
  const { data, error } = await supabase.rpc('merchant_stats', {
    p_merchant: merchantId,
  });
  if (error) throw error;

  const row = data?.[0];
  return {
    customersCount: row?.customers_count ?? 0,
    scansToday: row?.scans_today ?? 0,
    rewardsThisMonth: row?.rewards_this_month ?? 0,
    returningRate: row?.returning_rate ?? 0,
  };
}

export type ActivityFilter = 'all' | 'credit' | 'redeem';

/**
 * Flux d'activité.
 *
 * `todayOnly` s'appuie sur les bornes calculées par le serveur dans le fuseau
 * du commerce, jamais sur celui de l'appareil : sinon l'écran « Activité du
 * jour » et le compteur « Scans aujourd'hui » du tableau de bord pourraient
 * afficher deux vérités différentes.
 */
export async function fetchActivity(
  merchantId: string,
  options: { filter?: ActivityFilter; todayOnly?: boolean; limit?: number } = {},
): Promise<ActivityRow[]> {
  const { filter = 'all', todayOnly = false, limit = 60 } = options;

  let query = supabase
    .from('merchant_activity')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter !== 'all') query = query.eq('kind', filter);

  if (todayOnly) {
    const { data: bounds, error: boundsError } = await supabase.rpc(
      'merchant_day_bounds',
      { p_merchant: merchantId },
    );
    if (boundsError) throw boundsError;
    const start = bounds?.[0]?.day_start;
    if (start) query = query.gte('created_at', start);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type CustomerFilter = 'all' | 'active' | 'reward' | 'new';

export async function fetchCustomers(
  merchantId: string,
  filter: CustomerFilter = 'all',
): Promise<CustomerRow[]> {
  let query = supabase
    .from('merchant_customers')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (filter === 'reward') query = query.eq('has_reward_available', true);
  if (filter === 'active') query = query.not('last_activity_at', 'is', null);
  if (filter === 'new') {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    query = query.gte('joined_at', since);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchCustomerHistory(
  merchantId: string,
  profileId: string,
): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from('merchant_activity')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchCustomerProgress(merchantId: string, profileId: string) {
  const { data, error } = await supabase
    .from('program_progress')
    .select('program_id, stamps, lifetime_stamps, rewards_redeemed, programs(id, name, emoji, threshold, status)')
    .eq('merchant_id', merchantId)
    .eq('profile_id', profileId);
  if (error) throw error;
  return data ?? [];
}

export type ProgramInput = {
  name: string;
  emoji: string;
  description?: string | undefined;
  threshold: number;
  surfaceColor?: string | undefined;
  borderColor?: string | undefined;
};

export async function createProgram(
  merchantId: string,
  input: ProgramInput,
  status: ProgramStatus,
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .insert({
      merchant_id: merchantId,
      name: input.name,
      emoji: input.emoji,
      description: input.description ?? null,
      threshold: input.threshold,
      status,
      surface_color: input.surfaceColor ?? null,
      border_color: input.borderColor ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Met à jour un programme SANS toucher au seuil.
 *
 * Le seuil passe obligatoirement par set_program_threshold(), qui impose
 * l'avertissement de la règle métier 4. Le laisser modifiable ici ouvrirait
 * une porte dérobée qui contournerait cette règle.
 */
export async function updateProgram(
  programId: string,
  patch: {
    name?: string;
    emoji?: string;
    description?: string | null;
    status?: ProgramStatus;
    surface_color?: string | null;
    border_color?: string | null;
  },
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .update(patch)
    .eq('id', programId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export type ThresholdImpact = {
  currentThreshold: number;
  enrolledCount: number;
  inProgressCount: number;
  wouldUnlock: number;
  wouldDelay: number;
  requiresWarning: boolean;
};

export async function fetchThresholdImpact(
  programId: string,
  threshold: number,
): Promise<ThresholdImpact> {
  const { data, error } = await supabase.rpc('program_threshold_impact', {
    p_program_id: programId,
    p_threshold: threshold,
  });
  if (error) throw error;

  const row = data?.[0];
  return {
    currentThreshold: row?.current_threshold ?? threshold,
    enrolledCount: row?.enrolled_count ?? 0,
    inProgressCount: row?.in_progress_count ?? 0,
    wouldUnlock: row?.would_unlock ?? 0,
    wouldDelay: row?.would_delay ?? 0,
    requiresWarning: row?.requires_warning ?? false,
  };
}

export async function setProgramThreshold(
  programId: string,
  threshold: number,
  confirmed: boolean,
): Promise<Program> {
  const { data, error } = await supabase.rpc('set_program_threshold', {
    p_program_id: programId,
    p_threshold: threshold,
    p_confirmed: confirmed,
  });
  if (error) throw error;
  return data as Program;
}
