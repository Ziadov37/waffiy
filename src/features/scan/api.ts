import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type ScanResult = Database['public']['Functions']['credit_visit']['Returns'];
export type ResolvedRow =
  Database['public']['Functions']['resolve_client_for_scan']['Returns'][number];

export type ScannedProgram = {
  id: string;
  name: string;
  emoji: string;
  threshold: number;
  stamps: number;
  rewardAvailable: boolean;
  isSuggested: boolean;
  secondsUntilNextCredit: number;
};

export type ScannedClient = {
  profileId: string;
  firstName: string;
  lastName: string;
  publicCode: string;
  joinedAt: string | null;
  isEnrolled: boolean;
  totalVisits: number;
  rewardsRedeemed: number;
  programs: ScannedProgram[];
  /** Programme proposé par défaut : le plus avancé en ratio (C6). */
  suggestedProgramId: string | null;
};

/**
 * Résout le client scanné et sa progression sur chaque programme actif.
 *
 * Une seule requête pour tout l'écran : le commerçant a un client devant lui,
 * enchaîner deux allers-retours réseau se verrait.
 */
export async function resolveClient(
  clientCode: string,
  merchantId: string,
): Promise<ScannedClient> {
  const { data, error } = await supabase.rpc('resolve_client_for_scan', {
    p_client_code: clientCode,
    p_merchant_id: merchantId,
  });
  if (error) throw error;

  const rows = (data ?? []) as ResolvedRow[];
  const head = rows[0];
  if (!head) {
    // Le client existe (sinon la fonction aurait levé CLIENT_NOT_FOUND) mais
    // le commerce n'a aucun programme actif : rien à créditer.
    throw new Error('PROGRAM_NOT_FOUND');
  }

  const programs: ScannedProgram[] = rows
    .filter((r) => r.program_id !== null)
    .map((r) => ({
      id: r.program_id,
      name: r.program_name,
      emoji: r.program_emoji,
      threshold: r.program_threshold,
      stamps: r.stamps,
      rewardAvailable: r.reward_available,
      isSuggested: r.is_suggested,
      secondsUntilNextCredit: r.seconds_until_next_credit,
    }));

  return {
    profileId: head.client_profile_id,
    firstName: head.client_first_name,
    lastName: head.client_last_name,
    publicCode: head.client_public_code,
    joinedAt: head.client_joined_at,
    isEnrolled: head.is_enrolled,
    totalVisits: head.total_visits,
    rewardsRedeemed: head.rewards_redeemed,
    programs,
    suggestedProgramId:
      programs.find((p) => p.isSuggested)?.id ?? programs[0]?.id ?? null,
  };
}

export async function creditVisit(input: {
  clientCode: string;
  programId: string;
  requestId: string;
  staffSessionToken?: string | null;
}): Promise<ScanResult> {
  const { data, error } = await supabase.rpc('credit_visit', {
    p_client_code: input.clientCode,
    p_program_id: input.programId,
    p_request_id: input.requestId,
    p_staff_session_token: input.staffSessionToken ?? null,
  });
  if (error) throw error;
  return data;
}

export async function redeemReward(input: {
  clientCode: string;
  programId: string;
  requestId: string;
  quantity?: number;
  staffSessionToken?: string | null;
}): Promise<ScanResult> {
  const { data, error } = await supabase.rpc('redeem_points', {
    p_client_code: input.clientCode,
    p_program_id: input.programId,
    p_request_id: input.requestId,
    p_quantity: input.quantity ?? 1,
    p_staff_session_token: input.staffSessionToken ?? null,
  });
  if (error) throw error;
  return data;
}
