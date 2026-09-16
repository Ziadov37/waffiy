-- =============================================================================
-- Waffiy — 0012 · create_merchant()
-- =============================================================================
-- L'inscription commerçant se fait en trois étapes (commerce, premier
-- programme, compte). À la validation, il faut créer les deux objets ensemble.
--
-- Deux insertions successives depuis l'application ne seraient pas atomiques :
-- une coupure réseau entre les deux laisserait un commerce sans programme,
-- donc un commerçant incapable de créditer quoi que ce soit et sans écran pour
-- comprendre pourquoi. Une fonction règle le problème par construction.

create or replace function public.create_merchant(
  p_name                text,
  p_category            public.merchant_category,
  p_city                text,
  p_program_name        text,
  p_threshold           int,
  p_phone               text default null,
  p_logo_url            text default null,
  p_program_emoji       text default '🎁',
  p_program_description text default null,
  p_surface_color       text default null,
  p_border_color        text default null
)
returns public.merchants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner    uuid := auth.uid();
  v_merchant public.merchants%rowtype;
begin
  if v_owner is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Un compte = un commerce en phase 1. Le modèle supporterait une chaîne
  -- (plusieurs lignes avec le même owner_id), mais l'interface n'a pas de
  -- sélecteur de commerce : en créer un second rendrait le premier
  -- inaccessible. On refuse explicitement plutôt que de créer ce piège.
  if exists (select 1 from public.merchants where owner_id = v_owner) then
    raise exception 'MERCHANT_ALREADY_EXISTS'
      using errcode = 'P0001',
            hint = 'Ce compte exploite déjà un commerce.';
  end if;

  if p_threshold is null or p_threshold < 2 or p_threshold > 50 then
    raise exception 'INVALID_THRESHOLD'
      using errcode = 'P0001', detail = 'Le seuil doit être compris entre 2 et 50.';
  end if;

  insert into public.merchants (owner_id, name, category, city, phone, logo_url)
  values (v_owner, btrim(p_name), p_category, btrim(p_city),
          nullif(btrim(coalesce(p_phone, '')), ''), p_logo_url)
  returning * into v_merchant;

  -- Le premier programme est créé ACTIF, non en brouillon : le commerçant
  -- vient de le décrire, il s'attend à pouvoir scanner dans la foulée.
  insert into public.programs (
    merchant_id, name, emoji, description, threshold, status,
    surface_color, border_color, sort_order
  ) values (
    v_merchant.id, btrim(p_program_name), coalesce(p_program_emoji, '🎁'),
    nullif(btrim(coalesce(p_program_description, '')), ''), p_threshold, 'active',
    p_surface_color, p_border_color, 0
  );

  return v_merchant;
end;
$$;

comment on function public.create_merchant is
  'Crée le commerce et son premier programme en une transaction. Refuse un second commerce par compte.';

revoke all on function public.create_merchant(
  text, public.merchant_category, text, text, int, text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_merchant(
  text, public.merchant_category, text, text, int, text, text, text, text, text, text
) to authenticated;
