-- =============================================================================
-- Waffiy — 0015 · Connexion par mot de passe avec alias téléphone
-- =============================================================================
-- L'identité Supabase du compte reste l'email vérifié. Le téléphone est un
-- alias de connexion facultatif : seule l'Edge Function, munie du rôle de
-- service, peut le convertir en email avant de déléguer la vérification du mot
-- de passe à Supabase Auth.

drop index if exists public.profiles_phone_key;

-- Les espaces et séparateurs ne doivent pas permettre d'enregistrer deux fois
-- le même numéro. Aucun préfixe pays n'est inventé : la même suite de chiffres
-- doit être saisie à l'inscription et à la connexion.
create unique index profiles_phone_key
  on public.profiles ((regexp_replace(phone, '[^0-9]', '', 'g')))
  where phone is not null and regexp_replace(phone, '[^0-9]', '', 'g') <> '';

create or replace function public.lookup_login_email(p_phone text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lower(p.email)
  from public.profiles p
  where p.deleted_at is null
    and p.email is not null
    and p.phone is not null
    and regexp_replace(p.phone, '[^0-9]', '', 'g') =
        regexp_replace(p_phone, '[^0-9]', '', 'g')
  limit 1;
$$;

comment on function public.lookup_login_email(text) is
  'Résout un alias téléphone pour l''Edge Function de connexion. Réservée au service_role.';

revoke all on function public.lookup_login_email(text) from public, anon, authenticated;
grant execute on function public.lookup_login_email(text) to service_role;
