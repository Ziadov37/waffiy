const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function normalizeAlgerianPhone(input: string): string | null {
  let digits = input.trim().replace(/\D/g, '');
  if (/^00213[567]\d{8}$/.test(digits)) digits = digits.slice(2);
  if (/^0[567]\d{8}$/.test(digits)) return `+213${digits.slice(1)}`;
  if (/^213[567]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^[567]\d{8}$/.test(digits)) return `+213${digits}`;
  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return reply(405, { error: 'method_not_allowed' });
  }

  let input: { phone?: unknown; password?: unknown };
  try {
    input = await request.json();
  } catch {
    return reply(400, { error: 'invalid_request' });
  }

  if (typeof input.phone !== 'string' || typeof input.password !== 'string') {
    return reply(400, { error: 'invalid_request' });
  }

  const phone = normalizeAlgerianPhone(input.phone);
  if (!phone || input.password.length === 0) {
    return reply(401, { error: 'invalid_credentials' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return reply(500, { error: 'server_configuration' });
  }

  try {
    const lookupResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/lookup_login_email`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_phone: phone }),
    });

    if (!lookupResponse.ok) {
      return reply(500, { error: 'server_error' });
    }

    const email: unknown = await lookupResponse.json();
    if (typeof email !== 'string' || !email) {
      return reply(401, { error: 'invalid_credentials' });
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: input.password }),
    });

    if (!authResponse.ok) {
      return reply(401, { error: 'invalid_credentials' });
    }

    const authData = (await authResponse.json()) as {
      access_token?: unknown;
      refresh_token?: unknown;
    };
    if (
      typeof authData.access_token !== 'string' ||
      typeof authData.refresh_token !== 'string'
    ) {
      return reply(401, { error: 'invalid_credentials' });
    }

    return reply(200, {
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
    });
  } catch {
    return reply(503, { error: 'temporarily_unavailable' });
  }
});
