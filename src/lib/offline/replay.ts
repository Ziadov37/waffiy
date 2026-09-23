import { onlineManager } from '@tanstack/react-query';

import { creditVisit, redeemReward } from '@/features/scan/api';
import { toAppError } from '@/lib/errors';
import { markFailed, readQueue, removeFromQueue, type PendingAction } from './queue';

export type ReplayOutcome = {
  action: PendingAction;
  status: 'synced' | 'rejected';
  reason?: string;
};

/**
 * Rejoue les actions mises en file pendant une coupure.
 *
 * Deux garde-fous :
 *
 * 1. Séquentiel, pas en parallèle. Deux crédits sur le même client partiraient
 *    ensemble et le second serait refusé par le délai anti-fraude, alors qu'ils
 *    ont été saisis à plusieurs minutes d'intervalle.
 *
 * 2. Un REFUS n'est pas une erreur à retenter. Si le serveur répond
 *    RATE_LIMITED ou NOT_ENROLLED, la réponse ne changera pas au prochain
 *    essai : l'action est marquée en échec, conservée avec son motif, et le
 *    commerçant décide. La rejouer en boucle masquerait le problème.
 */
export async function replayQueue(): Promise<ReplayOutcome[]> {
  if (!onlineManager.isOnline()) return [];

  const queue = await readQueue();
  const outcomes: ReplayOutcome[] = [];

  for (const action of queue) {
    if (action.status === 'failed') continue; // laissé à l'arbitrage du commerçant

    try {
      const call = action.kind === 'credit' ? creditVisit : redeemReward;
      await call({
        clientCode: action.clientCode,
        programId: action.programId,
        // La clé d'idempotence d'origine : c'est elle qui rend le rejeu sûr
        // si l'action avait en réalité abouti avant la coupure.
        requestId: action.requestId,
        quantity: action.quantity ?? 1,
        staffSessionToken: action.staffSessionToken ?? null,
      });

      await removeFromQueue(action.requestId);
      outcomes.push({ action, status: 'synced' });
    } catch (error) {
      const appError = toAppError(error);

      if (appError.code === 'NETWORK') {
        // Le réseau est retombé : on s'arrête là et on garde le reste intact.
        break;
      }

      await markFailed(action.requestId, appError.message);
      outcomes.push({ action, status: 'rejected', reason: appError.message });
    }
  }

  return outcomes;
}
