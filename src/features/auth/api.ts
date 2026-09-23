import { Platform } from 'react-native';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { normalizeAlgerianPhone } from '@/lib/phone';
import type { Database } from '@/types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Merchant = Database['public']['Tables']['merchants']['Row'];
export type MerchantCategory = Database['public']['Enums']['merchant_category'];

export type SignUpMetadata = {
  firstName: string;
  lastName: string;
  phone?: string;
};

export class AuthFlowError extends Error {
  constructor(
    public readonly code: 'EMAIL_CONFIRMATION_DISABLED' | 'INVALID_CREDENTIALS',
    message: string,
  ) {
    super(message);
    this.name = 'AuthFlowError';
  }
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthFlowError) return error.message;

  const code = (error as { code?: unknown } | null)?.code;
  switch (code) {
    case 'invalid_credentials':
      return 'Email, téléphone ou mot de passe incorrect.';
    case 'email_not_confirmed':
      return 'Votre inscription n’est pas encore confirmée. Vérifiez votre email.';
    case 'user_already_exists':
    case 'email_exists':
    case 'identity_already_exists':
      return 'Un compte existe déjà avec cette adresse email.';
    case 'anonymous_provider_disabled':
      return 'La création rapide de carte est momentanément indisponible.';
    case 'weak_password':
      return 'Choisissez un mot de passe plus difficile à deviner.';
    case 'signup_disabled':
      return 'Les inscriptions sont momentanément indisponibles.';
    case 'phone_provider_disabled':
    case 'sms_send_failed':
      return 'La vérification par SMS est momentanément indisponible.';
    case 'over_sms_send_rate_limit':
      return 'Trop de codes ont été demandés. Réessayez dans quelques minutes.';
    default:
      return 'Une erreur est survenue. Réessayez dans un instant.';
  }
}

/** Crée le compte avec un mot de passe et déclenche l'email de confirmation. */
export async function signUpWithPassword(
  email: string,
  password: string,
  metadata: SignUpMetadata,
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        first_name: metadata.firstName,
        last_name: metadata.lastName,
        ...(metadata.phone ? { phone: metadata.phone } : {}),
      },
    },
  });
  if (error) throw error;

  // Si « Confirm email » est désactivé dans Supabase, signUp ouvre une session
  // immédiatement et aucun code n'est envoyé. Refuser cet état évite qu'une
  // mauvaise configuration contourne silencieusement la vérification voulue.
  if (data.session) {
    await supabase.auth.signOut();
    throw new AuthFlowError(
      'EMAIL_CONFIRMATION_DISABLED',
      'La confirmation par email doit être activée dans Supabase.',
    );
  }
}

export async function verifySignupCode(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'signup',
  });
  if (error) throw error;
  return data.session;
}

export async function resendSignupCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  });
  if (error) throw error;
}

/**
 * Ouvre une session cliente sans collecter de donnée personnelle.
 * La session est persistée dans SecureStore et pourra être convertie plus tard
 * sans changer d'identifiant, donc sans déplacer les cartes ni les points.
 */
export async function signInAnonymously() {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return existing.session;

  // Sur certains navigateurs mobiles, le flux interne de supabase-js peut
  // rester suspendu avant même d'envoyer POST /auth/v1/signup. Le site public
  // utilise donc l'endpoint Auth officiel directement, puis remet les jetons
  // au client Supabase pour conserver exactement la même session persistée.
  if (Platform.OS === 'web') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(`${env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        access_token?: string;
        refresh_token?: string;
        error_code?: string;
        msg?: string;
      };

      if (!response.ok) {
        const error = new Error(payload.msg ?? 'ANONYMOUS_SIGN_IN_FAILED') as Error & {
          code?: string;
        };
        if (payload.error_code) error.code = payload.error_code;
        throw error;
      }
      if (!payload.access_token || !payload.refresh_token) {
        throw new Error('ANONYMOUS_SESSION_MISSING');
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      if (error) throw error;
      if (!data.session) throw new Error('ANONYMOUS_SESSION_MISSING');
      return data.session;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('NETWORK_TIMEOUT');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session) throw new Error('ANONYMOUS_SESSION_MISSING');
  return data.session;
}

export type SecureAccountDetails = {
  firstName: string;
  lastName: string;
  email: string;
};

const SECURE_ACCOUNT_REDIRECT = 'waffiy://secure-account?emailConfirmed=1';
const PASSWORD_RESET_REDIRECT = 'waffiy://reset-password';

/** Associe un email à la session invitée et déclenche son code de vérification. */
export async function startGuestAccountUpgrade(input: SecureAccountDetails) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user.is_anonymous) {
    throw new Error('GUEST_SESSION_REQUIRED');
  }

  const email = input.email.trim().toLowerCase();
  const { error } = await supabase.auth.updateUser(
    {
      email,
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
      },
    },
    { emailRedirectTo: SECURE_ACCOUNT_REDIRECT },
  );
  if (error) throw error;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
    })
    .eq('id', sessionData.session.user.id);
  if (profileError) throw profileError;
}

export async function verifyGuestAccountEmail(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email_change',
  });
  if (error) throw error;
  return data.session;
}

export async function resendGuestAccountCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'email_change',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: SECURE_ACCOUNT_REDIRECT },
  });
  if (error) throw error;
}

/**
 * Après un clic sur le lien Supabase, renouvelle le JWT local afin que le
 * statut `is_anonymous` et l'email vérifié reflètent l'utilisateur serveur.
 */
export async function confirmGuestAccountLink() {
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!refreshed.session || !data.user.email || data.user.is_anonymous) {
    throw new Error('EMAIL_CHANGE_NOT_CONFIRMED');
  }
  return refreshed.session;
}

export async function finishGuestAccountUpgrade(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: PASSWORD_RESET_REDIRECT },
  );
  if (error) throw error;
}

export async function restoreRecoverySession(url: string | null) {
  if (!url) throw new Error('RECOVERY_LINK_MISSING');

  const query = new URLSearchParams(url.split('?')[1]?.split('#')[0] ?? '');
  const fragment = new URLSearchParams(url.split('#')[1] ?? '');
  const errorDescription =
    fragment.get('error_description') ?? query.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const accessToken = fragment.get('access_token') ?? query.get('access_token');
  const refreshToken = fragment.get('refresh_token') ?? query.get('refresh_token');
  const type = fragment.get('type') ?? query.get('type');

  // Supabase peut utiliser PKCE et renvoyer un `code`, ou le flux implicite
  // historique et renvoyer les deux jetons dans le fragment de l'URL.
  const code = query.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  if (!accessToken || !refreshToken || type !== 'recovery') {
    throw new Error('INVALID_RECOVERY_LINK');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return data.session;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function requestPhoneVerification(phoneInput: string) {
  const phone = normalizeAlgerianPhone(phoneInput);
  if (!phone) throw new Error('INVALID_DZ_PHONE');

  const { data, error } = await supabase.auth.updateUser({ phone });
  if (error) throw error;
  return data.user;
}

export async function verifyPhoneCode(phoneInput: string, token: string) {
  const phone = normalizeAlgerianPhone(phoneInput);
  if (!phone) throw new Error('INVALID_DZ_PHONE');

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: token.trim(),
    type: 'phone_change',
  });
  if (error) throw error;
  return data.session;
}

export async function resendPhoneCode(phoneInput: string): Promise<void> {
  const phone = normalizeAlgerianPhone(phoneInput);
  if (!phone) throw new Error('INVALID_DZ_PHONE');

  const { error } = await supabase.auth.resend({ type: 'phone_change', phone });
  if (error) throw error;
}

type PhoneLoginResponse = {
  access_token?: string;
  refresh_token?: string;
};

const AUTH_REQUEST_TIMEOUT_MS = 15_000;

async function withAuthTimeout<T>(request: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () =>
        reject(
          new AuthFlowError(
            'INVALID_CREDENTIALS',
            'Le service de connexion ne répond pas. Vérifiez votre réseau.',
          ),
        ),
      AUTH_REQUEST_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

/** Connexion quotidienne : aucun email ni SMS n'est envoyé. */
export async function signInWithPassword(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim();

  if (normalizedIdentifier.includes('@')) {
    const { data, error } = await withAuthTimeout(
      supabase.auth.signInWithPassword({
        email: normalizedIdentifier.toLowerCase(),
        password,
      }),
    );
    if (error) throw error;
    return data.session;
  }

  // Supabase Auth ne connaît que l'email du compte : le téléphone facultatif
  // vit dans profiles. La fonction serveur résout ce téléphone sans renvoyer
  // l'email au client, puis délègue la vérification du mot de passe à Auth.
  const { data, error } = await withAuthTimeout(
    supabase.functions.invoke<PhoneLoginResponse>('login-with-phone', {
      body: {
        phone: normalizeAlgerianPhone(normalizedIdentifier) ?? normalizedIdentifier,
        password,
      },
    }),
  );

  if (error || !data?.access_token || !data.refresh_token) {
    throw new AuthFlowError(
      'INVALID_CREDENTIALS',
      'Email, téléphone ou mot de passe incorrect.',
    );
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) throw sessionError;
  return sessionData.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Le commerce exploité par le compte connecté, s'il en a un.
 *
 * C'est cette requête, et elle seule, qui détermine si l'utilisateur peut
 * basculer en mode commerçant (décision D2 : le rôle est une capacité dérivée,
 * pas une colonne). La RLS la restreint déjà au commerce dont il est
 * propriétaire — le filtre explicite ne sert qu'à la lisibilité.
 */
export async function fetchMyMerchant(userId: string): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  patch: Database['public']['Tables']['profiles']['Update'],
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
