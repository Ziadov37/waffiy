import * as SecureStore from 'expo-secure-store';

/**
 * Stockage chiffré pour la session Supabase.
 *
 * AsyncStorage écrirait le jeton de rafraîchissement EN CLAIR sur le disque :
 * sur un appareil rooté ou dans une sauvegarde, il suffirait à usurper le
 * compte. SecureStore passe par le trousseau iOS et le Keystore Android.
 *
 * Mais SecureStore plafonne à 2 048 octets par valeur sur Android, et une
 * session Supabase dépasse régulièrement ce seuil une fois les métadonnées
 * utilisateur incluses. On découpe donc la valeur en tranches.
 */
const CHUNK_SIZE = 1800;
const COUNT_SUFFIX = '__chunks';

async function clearChunks(key: string, count: number): Promise<void> {
  const deletions: Promise<void>[] = [];
  for (let i = 0; i < count; i += 1) {
    deletions.push(SecureStore.deleteItemAsync(`${key}.${i}`));
  }
  await Promise.all(deletions);
}

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(`${key}${COUNT_SUFFIX}`);
  const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const count = await readCount(key);
      if (count === 0) return null;

      const parts = await Promise.all(
        Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
      );

      // Une tranche manquante rend la valeur inexploitable. Mieux vaut
      // renvoyer null — l'utilisateur se reconnecte — que de rendre une
      // session tronquée qui échouerait de façon opaque à chaque appel.
      if (parts.some((p) => p === null)) {
        await this.removeItem(key);
        return null;
      }

      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const previous = await readCount(key);

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)),
    );
    await SecureStore.setItemAsync(`${key}${COUNT_SUFFIX}`, String(chunks.length));

    // Une session plus courte que la précédente laisserait des tranches
    // orphelines, qui seraient relues lors d'un futur allongement.
    if (previous > chunks.length) {
      const stale: Promise<void>[] = [];
      for (let i = chunks.length; i < previous; i += 1) {
        stale.push(SecureStore.deleteItemAsync(`${key}.${i}`));
      }
      await Promise.all(stale);
    }
  },

  async removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    await clearChunks(key, count);
    await SecureStore.deleteItemAsync(`${key}${COUNT_SUFFIX}`);
  },
};
