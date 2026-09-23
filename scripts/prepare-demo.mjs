// Réutilise les comptes du seed sans réinitialiser leurs visites.
// Usage : node --env-file=.env scripts/prepare-demo.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Les variables Supabase de .env sont requises.');

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const password = 'WaffiyDemo2026!';

async function login(email) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Connexion de démonstration ${email} : ${error.message}`);
}

try {
  await login('karim@burgerhouse.dz');
  const { data: programs, error } = await supabase
    .from('programs')
    .update({ status: 'active' })
    .eq('merchant_id', '33333333-3333-4333-8333-111111111111')
    .in('id', [
      '44444444-4444-4444-8444-111111111111',
      '44444444-4444-4444-8444-222222222222',
    ])
    .select('name');
  if (error) throw error;
  if (programs.length !== 2) throw new Error('Les deux programmes du seed sont requis.');
  console.log('Burger House :', programs.map((program) => program.name).join(', '));
  for (const [id, threshold] of [
    ['44444444-4444-4444-8444-111111111111', 5],
    ['44444444-4444-4444-8444-222222222222', 15],
  ]) {
    const { error: priceError } = await supabase.rpc('set_program_threshold', {
      p_program_id: id,
      p_threshold: threshold,
      p_confirmed: true,
    });
    if (priceError) throw priceError;
    const { error: iconError } = await supabase.from('programs')
      .update({ emoji: threshold === 5 ? '🍔' : '🍕' }).eq('id', id);
    if (iconError) throw iconError;
  }
  const { error: menuError } = await supabase.from('programs').upsert(
    {
      id: '44444444-4444-4444-8444-666666666666',
      merchant_id: '33333333-3333-4333-8333-111111111111',
      name: 'Menu offert',
      emoji: '🍟',
      description: 'Burger, frites et boisson',
      threshold: 10,
      status: 'active',
      sort_order: 1,
      surface_color: '#E9F7F0',
      border_color: '#CFEADD',
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (menuError) throw menuError;

  await login('sarah.benali@example.dz');
  for (const code of ['BURGER23', 'CAFE2345', 'BEAUTY23']) {
    const { error: joinError } = await supabase.rpc('join_merchant', {
      p_join_code: code,
    });
    if (joinError) throw joinError;
  }

  const { data: cards, error: cardsError } = await supabase
    .from('memberships')
    .select('merchants(name)');
  if (cardsError) throw cardsError;
  const { data: progress, error: progressError } = await supabase
    .from('memberships')
    .select('points, merchants(name)');
  if (progressError) throw progressError;
  console.log('Cartes de Sarah :', cards.map((card) => card.merchants.name).join(', '));
  console.table(
    progress.map((row) => ({
      commerce: row.merchants.name,
      points: row.points,
    })),
  );
} finally {
  await supabase.auth.signOut({ scope: 'local' });
}
