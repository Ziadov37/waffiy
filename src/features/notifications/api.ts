import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationKind = Database['public']['Enums']['notification_kind'];

/** L'emoji et la teinte se déduisent du type : ils ne sont pas stockés en base. */
export const NOTIFICATION_STYLE: Record<
  NotificationKind,
  { emoji: string; tone: 'neutral' | 'success' | 'reward' }
> = {
  visit_credited: { emoji: '⭐', tone: 'success' },
  almost_there: { emoji: '🔥', tone: 'neutral' },
  reward_unlocked: { emoji: '🎁', tone: 'reward' },
  reward_redeemed: { emoji: '🎁', tone: 'reward' },
  system: { emoji: '📣', tone: 'neutral' },
};

export async function fetchNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Marque toutes les notifications comme lues.
 *
 * Le déclencheur notifications_guard_update neutralise toute autre colonne :
 * même si l'application en envoyait d'autres, seul read_at serait retenu.
 */
export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}
