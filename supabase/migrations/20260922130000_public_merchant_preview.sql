-- =============================================================================
-- Waffiy — aperçu public d'un commerce depuis son QR HTTPS
-- =============================================================================
-- Le QR de comptoir est public par nature. Cette fonction expose uniquement les
-- informations nécessaires à sa page d'accueil, jamais owner_id, téléphone,
-- join_code, statistiques ou données clients.

create or replace function public.get_public_merchant(p_join_code text)
returns table (
  merchant_id uuid,
  merchant_name text,
  merchant_category public.merchant_category,
  merchant_city text,
  merchant_logo_url text,
  reward_name text,
  reward_emoji text,
  reward_description text,
  reward_threshold int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    m.id,
    m.name,
    m.category,
    m.city,
    m.logo_url,
    reward.name,
    reward.emoji,
    reward.description,
    reward.threshold
  from public.merchants m
  left join lateral (
    select p.name, p.emoji, p.description, p.threshold
    from public.programs p
    where p.merchant_id = m.id
      and p.status = 'active'
    order by p.sort_order, p.threshold, p.created_at
    limit 1
  ) reward on true
  where m.status = 'active'
    and m.join_code = upper(translate(btrim(p_join_code), '- ', ''))
    and upper(translate(btrim(p_join_code), '- ', '')) ~ '^[2-9A-HJKMNP-Z]{8}$'
  limit 1;
$$;

comment on function public.get_public_merchant(text) is
  'Aperçu minimal d’un commerce actif pour sa page QR publique. N’expose ni join_code ni donnée privée.';

revoke all on function public.get_public_merchant(text) from public;
grant execute on function public.get_public_merchant(text) to anon, authenticated;
