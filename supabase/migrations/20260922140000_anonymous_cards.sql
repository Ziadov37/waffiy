-- =============================================================================
-- Waffiy — carte immédiate avec compte anonyme récupérable ensuite
-- =============================================================================
-- Les comptes anonymes utilisent le rôle PostgreSQL `authenticated`. Ils
-- peuvent donc rejoindre un commerce et recevoir des points avec les mêmes
-- politiques RLS qu'un client permanent. En revanche, ils ne doivent jamais
-- pouvoir exploiter un commerce.

create or replace function public.reject_anonymous_merchant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'PERMANENT_ACCOUNT_REQUIRED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger merchants_reject_anonymous_owner
  before insert on public.merchants
  for each row execute function public.reject_anonymous_merchant();

comment on function public.reject_anonymous_merchant() is
  'Empêche une session invitée de créer un commerce, y compris via une fonction SECURITY DEFINER.';
