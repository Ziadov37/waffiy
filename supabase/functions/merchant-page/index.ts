const htmlHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  'Content-Security-Policy':
    "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

type MerchantPreview = {
  merchant_id: string;
  merchant_name: string;
  merchant_category: string;
  merchant_city: string;
  merchant_logo_url: string | null;
  reward_name: string | null;
  reward_emoji: string | null;
  reward_description: string | null;
  reward_threshold: number | null;
};

const categoryLabels: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  fast_food: 'Snack et restauration rapide',
  bakery: 'Boulangerie et pâtisserie',
  beauty: 'Beauté',
  retail: 'Commerce',
  other: 'Commerce local',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pageShell(content: string, title = 'Waffiy'): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#16A36A" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      html { background: #f7f8fa; color: #0f172a; font-family: Manrope, Inter, system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
      main { width: min(100%, 430px); }
      .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; font-weight: 800; font-size: 20px; }
      .brand-mark { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; color: #fff; background: #16a36a; }
      .card { padding: 24px; border: 1px solid #e6e9f0; border-radius: 28px; background: #fff; box-shadow: 0 16px 50px rgba(15, 23, 42, .08); }
      .identity { display: flex; align-items: center; gap: 16px; }
      .logo { width: 64px; height: 64px; border-radius: 18px; object-fit: cover; border: 1px solid #e6e9f0; background: #effbf4; }
      .logo-fallback { display: grid; place-items: center; font-size: 28px; font-weight: 800; color: #0f7e51; }
      h1 { margin: 0; font-size: 26px; line-height: 1.18; letter-spacing: -.03em; }
      .meta { margin: 5px 0 0; color: #56606f; font-size: 15px; }
      .reward { margin-top: 24px; padding: 18px; border: 1px solid #c8eeda; border-radius: 20px; background: #effbf4; }
      .reward-label { margin: 0 0 8px; color: #0f7e51; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
      .reward-title { margin: 0; font-size: 19px; line-height: 1.35; font-weight: 800; }
      .reward-copy { margin: 6px 0 0; color: #56606f; line-height: 1.55; }
      .action { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 54px; margin-top: 22px; padding: 14px 18px; border: 0; border-radius: 16px; color: #fff; background: #16a36a; font: inherit; font-weight: 800; text-decoration: none; cursor: pointer; }
      .hint { margin: 14px 4px 0; color: #56606f; font-size: 14px; line-height: 1.5; text-align: center; }
      .error { text-align: center; }
      .error h1 { margin-bottom: 10px; }
      @media (max-width: 360px) { body { padding: 16px; } .card { padding: 20px; } }
      @media (prefers-reduced-motion: no-preference) { .card { animation: enter .35s ease-out both; } @keyframes enter { from { opacity: 0; transform: translateY(8px); } } }
    </style>
  </head>
  <body>${content}</body>
</html>`;
}

function errorPage(message: string): string {
  return pageShell(
    `<main>
    <div class="brand"><span class="brand-mark">W</span> Waffiy</div>
    <section class="card error">
      <h1>Carte introuvable</h1>
      <p class="meta">${escapeHtml(message)}</p>
    </section>
  </main>`,
    'Carte introuvable · Waffiy',
  );
}

function merchantPage(merchant: MerchantPreview, code: string): string {
  const initial = merchant.merchant_name.trim().slice(0, 1).toUpperCase() || 'W';
  const logo = merchant.merchant_logo_url
    ? `<img class="logo" src="${escapeHtml(merchant.merchant_logo_url)}" alt="Logo ${escapeHtml(merchant.merchant_name)}" />`
    : `<div class="logo logo-fallback" aria-hidden="true">${escapeHtml(initial)}</div>`;
  const category = categoryLabels[merchant.merchant_category] ?? 'Commerce local';
  const reward = merchant.reward_name
    ? `<section class="reward">
        <p class="reward-label">Votre prochaine récompense</p>
        <p class="reward-title">${escapeHtml(merchant.reward_emoji ?? '🎁')} ${escapeHtml(merchant.reward_name)}</p>
        ${merchant.reward_threshold ? `<p class="reward-copy">Après ${merchant.reward_threshold} passages admissibles.</p>` : ''}
        ${merchant.reward_description ? `<p class="reward-copy">${escapeHtml(merchant.reward_description)}</p>` : ''}
      </section>`
    : '';
  const appUrl = `waffiy://join?code=${encodeURIComponent(code)}`;

  return pageShell(
    `<main>
    <div class="brand"><span class="brand-mark">W</span> Waffiy</div>
    <section class="card">
      <div class="identity">
        ${logo}
        <div>
          <h1>${escapeHtml(merchant.merchant_name)}</h1>
          <p class="meta">${escapeHtml(category)} · ${escapeHtml(merchant.merchant_city)}</p>
        </div>
      </div>
      ${reward}
      <a class="action" href="${escapeHtml(appUrl)}">Ajouter ma carte dans Waffiy</a>
      <p class="hint">Waffiy s’ouvre sur ce commerce. Si vous n’avez pas encore de compte, le code sera conservé pendant votre inscription.</p>
    </section>
  </main>`,
    `${merchant.merchant_name} · Waffiy`,
  );
}

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(
      errorPage('Cette page accepte uniquement les liens du QR Waffiy.'),
      {
        status: 405,
        headers: htmlHeaders,
      },
    );
  }

  const code = new URL(request.url).searchParams
    .get('code')
    ?.replace(/[\s-]/g, '')
    .toUpperCase();
  if (!code || !/^[2-9A-HJKMNP-Z]{8}$/.test(code)) {
    return new Response(errorPage('Le lien scanné est incomplet ou invalide.'), {
      status: 400,
      headers: htmlHeaders,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return new Response(errorPage('Le service est momentanément indisponible.'), {
      status: 500,
      headers: { ...htmlHeaders, 'Cache-Control': 'no-store' },
    });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_merchant`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_join_code: code }),
    });

    if (!response.ok) throw new Error('merchant_lookup_failed');
    const rows = (await response.json()) as MerchantPreview[];
    const merchant = rows[0];
    if (!merchant) {
      return new Response(errorPage('Ce commerce n’est pas disponible.'), {
        status: 404,
        headers: htmlHeaders,
      });
    }

    return new Response(request.method === 'HEAD' ? null : merchantPage(merchant, code), {
      status: 200,
      headers: htmlHeaders,
    });
  } catch {
    return new Response(errorPage('Impossible de charger cette carte pour le moment.'), {
      status: 503,
      headers: { ...htmlHeaders, 'Cache-Control': 'no-store' },
    });
  }
});
