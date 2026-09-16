import { z } from 'zod';

/**
 * Validation des variables d'environnement au démarrage.
 *
 * Sans elle, une variable absente se manifeste par un « Network request
 * failed » incompréhensible au premier appel réseau, souvent plusieurs écrans
 * après la cause. Ici, l'erreur est immédiate et dit quoi corriger.
 */
const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .string()
    .url('EXPO_PUBLIC_SUPABASE_URL doit être une URL complète (https://xxx.supabase.co).'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'EXPO_PUBLIC_SUPABASE_ANON_KEY est absente ou tronquée.'),
});

// process.env.EXPO_PUBLIC_* est remplacé littéralement à la compilation par
// Metro : il faut donc écrire les accès en toutes lettres, un accès dynamique
// renverrait undefined.
const parsed = schema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  • ${i.message}`).join('\n');
  throw new Error(
    `Configuration Waffiy incomplète.\n${details}\n\n` +
      'Copiez .env.example en .env et renseignez les valeurs de votre projet Supabase.',
  );
}

export const env = parsed.data;
