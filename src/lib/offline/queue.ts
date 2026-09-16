import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

const STORAGE_KEY = 'waffiy.pending-actions';

/**
 * File des actions en attente de synchronisation.
 *
 * Résout la contradiction C5 du cadrage : la règle métier 7 impose des
 * transactions serveur atomiques, tandis que le commerçant peut se trouver en
 * sous-sol. Les deux sont inconciliables au sens strict — on ne calcule pas
 * une transaction sans serveur.
 *
 * La résolution retenue :
 *   • hors ligne, l'intention est mise en file avec une CLÉ D'IDEMPOTENCE
 *     générée sur l'appareil ;
 *   • l'interface affiche « En attente de synchronisation », JAMAIS
 *     « +1 visite ajoutée » — annoncer un succès qui n'a pas eu lieu est la
 *     pire issue possible pour un commerçant face à son client ;
 *   • au retour du réseau, la file est rejouée ; la contrainte d'unicité sur
 *     transactions.client_request_id rend un double envoi inoffensif ;
 *   • une intention peut être REFUSÉE à la synchronisation (délai anti-fraude
 *     écoulé entre-temps, programme repassé en brouillon). Elle est alors
 *     conservée avec son motif, à charge pour le commerçant de la voir.
 */
const pendingActionSchema = z.object({
  /** Clé d'idempotence. Générée à la mise en file, jamais régénérée. */
  requestId: z.string().uuid(),
  kind: z.enum(['credit', 'redeem']),
  merchantId: z.string().uuid(),
  programId: z.string().uuid(),
  programName: z.string(),
  clientCode: z.string(),
  clientName: z.string(),
  createdAt: z.string(),
  attempts: z.number().int().min(0),
  status: z.enum(['pending', 'failed']),
  lastError: z.string().optional(),
});

export type PendingAction = z.infer<typeof pendingActionSchema>;

const queueSchema = z.array(pendingActionSchema);

export function newRequestId(): string {
  return Crypto.randomUUID();
}

export async function readQueue(): Promise<PendingAction[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = queueSchema.safeParse(JSON.parse(raw));
    // Une file corrompue — par exemple après un changement de format — est
    // écartée plutôt que de faire planter l'application au démarrage. Le
    // risque est de perdre des actions non synchronisées ; le garde-fou est
    // que le format ne change qu'avec une migration explicite.
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

async function writeQueue(actions: PendingAction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}

export async function enqueue(
  action: Omit<PendingAction, 'createdAt' | 'attempts' | 'status'>,
): Promise<PendingAction> {
  const entry: PendingAction = {
    ...action,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  };
  const queue = await readQueue();
  await writeQueue([...queue, entry]);
  return entry;
}

export async function removeFromQueue(requestId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((a) => a.requestId !== requestId));
}

export async function markFailed(requestId: string, reason: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(
    queue.map((a) =>
      a.requestId === requestId
        ? { ...a, status: 'failed' as const, attempts: a.attempts + 1, lastError: reason }
        : a,
    ),
  );
}

export async function markRetrying(requestId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(
    queue.map((a) =>
      a.requestId === requestId ? { ...a, status: 'pending' as const } : a,
    ),
  );
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
