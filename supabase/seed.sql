-- =============================================================================
-- Waffiy — jeu de données de démonstration
-- =============================================================================
-- Reprend les commerces, clients et soldes du prototype (docs/design/), pour
-- que l'application affiche dès le premier lancement des écrans crédibles.
--
-- Principe : les soldes ne sont JAMAIS écrits à la main. On génère de vraies
-- transactions et le solde en découle. Un jeu de démonstration incohérent avec
-- son registre invaliderait la promesse « le registre est la source de vérité ».
--
-- Mot de passe commun aux comptes de démonstration : WaffiyDemo2026!
-- Il est volontairement public et ne doit jamais être réutilisé en production.

begin;

-- -----------------------------------------------------------------------------
-- Outil de génération (supprimé en fin de fichier)
-- -----------------------------------------------------------------------------

create or replace function public.__seed_credits(
  p_client   uuid,
  p_program  uuid,
  p_count    int,
  p_first_at timestamptz,
  p_step     interval default '6 days'
)
returns void
language plpgsql
as $$
declare
  v_program  public.programs%rowtype;
  v_owner    uuid;
  v_before   int;
  v_at       timestamptz;
  i          int;
begin
  select * into v_program from public.programs where id = p_program;
  select owner_id into v_owner from public.merchants where id = v_program.merchant_id;

  select coalesce(stamps, 0) into v_before
  from public.program_progress
  where profile_id = p_client and program_id = p_program;
  v_before := coalesce(v_before, 0);

  for i in 1 .. p_count loop
    v_at := p_first_at + (i - 1) * p_step;

    insert into public.transactions (
      merchant_id, program_id, profile_id, actor_profile_id,
      kind, delta, stamps_before, stamps_after, threshold_at_time,
      client_request_id, source, created_at
    ) values (
      v_program.merchant_id, p_program, p_client, v_owner,
      'credit', 1, v_before, v_before + 1, v_program.threshold,
      gen_random_uuid(), 'scan', v_at
    );

    v_before := v_before + 1;
  end loop;

  insert into public.program_progress (profile_id, program_id, merchant_id, stamps, lifetime_stamps, last_credit_at)
  values (p_client, p_program, v_program.merchant_id, v_before, v_before, v_at)
  on conflict (profile_id, program_id) do update
    set stamps          = excluded.stamps,
        lifetime_stamps = public.program_progress.lifetime_stamps + p_count,
        last_credit_at  = excluded.last_credit_at;

  update public.memberships
  set last_activity_at = greatest(coalesce(last_activity_at, v_at), v_at)
  where profile_id = p_client and merchant_id = v_program.merchant_id;
end;
$$;

create or replace function public.__seed_redeem(
  p_client  uuid,
  p_program uuid,
  p_at      timestamptz
)
returns void
language plpgsql
as $$
declare
  v_program public.programs%rowtype;
  v_owner   uuid;
  v_before  int;
begin
  select * into v_program from public.programs where id = p_program;
  select owner_id into v_owner from public.merchants where id = v_program.merchant_id;

  select stamps into v_before
  from public.program_progress
  where profile_id = p_client and program_id = p_program;

  if v_before is null or v_before < v_program.threshold then
    raise exception 'Jeu de démonstration incohérent : % tampons pour un seuil de %.',
      coalesce(v_before, 0), v_program.threshold;
  end if;

  insert into public.transactions (
    merchant_id, program_id, profile_id, actor_profile_id,
    kind, delta, stamps_before, stamps_after, threshold_at_time,
    reward_label, client_request_id, source, created_at
  ) values (
    v_program.merchant_id, p_program, p_client, v_owner,
    'redeem', -v_program.threshold, v_before, v_before - v_program.threshold, v_program.threshold,
    v_program.name, gen_random_uuid(), 'scan', p_at
  );

  update public.program_progress
  set stamps           = v_before - v_program.threshold,
      rewards_redeemed = rewards_redeemed + 1
  where profile_id = p_client and program_id = p_program;
end;
$$;

-- -----------------------------------------------------------------------------
-- Comptes
-- -----------------------------------------------------------------------------
-- Le déclencheur on_auth_user_created crée les profils automatiquement.

insert into auth.users (id, email, raw_user_meta_data) values
  -- Commerçants
  ('11111111-1111-4111-8111-111111111111', 'karim@burgerhouse.dz',
   '{"first_name":"Karim","last_name":"Belhadj"}'::jsonb),
  ('11111111-1111-4111-8111-222222222222', 'nadir@coffeelab.dz',
   '{"first_name":"Nadir","last_name":"Slimani"}'::jsonb),
  ('11111111-1111-4111-8111-333333333333', 'yasmine@beautystudio.dz',
   '{"first_name":"Yasmine","last_name":"Cherif"}'::jsonb),
  -- Clients
  ('22222222-2222-4222-8222-111111111111', 'sarah.benali@example.dz',
   '{"first_name":"Sarah","last_name":"Benali"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'yacine.meziane@example.dz',
   '{"first_name":"Yacine","last_name":"Meziane"}'::jsonb),
  ('22222222-2222-4222-8222-333333333333', 'amine.kaci@example.dz',
   '{"first_name":"Amine","last_name":"Kaci"}'::jsonb),
  ('22222222-2222-4222-8222-444444444444', 'lina.belkacem@example.dz',
   '{"first_name":"Lina","last_name":"Belkacem"}'::jsonb),
  ('22222222-2222-4222-8222-555555555555', 'nadia.hamdi@example.dz',
   '{"first_name":"Nadia","last_name":"Hamdi"}'::jsonb);

-- Le banc de tests SQL utilise une imitation minimale de auth.users, sans les
-- colonnes de GoTrue. Sur une vraie instance Supabase, rendre les comptes
-- immédiatement utilisables : mot de passe chiffré et email déjà confirmé.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'encrypted_password'
  ) then
    execute $sql$
      update auth.users
      set instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
          aud = 'authenticated',
          role = 'authenticated',
          encrypted_password = extensions.crypt(
            'WaffiyDemo2026!',
            extensions.gen_salt('bf')
          ),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          confirmation_token = '',
          recovery_token = '',
          email_change = '',
          email_change_token_new = '',
          email_change_token_current = '',
          phone_change = '',
          phone_change_token = '',
          reauthentication_token = '',
          raw_app_meta_data = jsonb_build_object(
            'provider', 'email',
            'providers', jsonb_build_array('email')
          ),
          is_sso_user = false,
          is_anonymous = false,
          created_at = coalesce(created_at, now()),
          updated_at = now()
      where id::text like '11111111-1111-4111-8111-%'
         or id::text like '22222222-2222-4222-8222-%'
    $sql$;

    -- GoTrue associe l'identité email au compte. Sans cette ligne, les
    -- utilisateurs insérés directement dans auth.users ne peuvent pas se
    -- connecter par mot de passe sur une instance Supabase hébergée.
    execute $sql$
      insert into auth.identities (
        provider_id, user_id, identity_data, provider, created_at, updated_at
      )
      select
        u.id::text,
        u.id,
        jsonb_build_object(
          'sub', u.id::text,
          'email', u.email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        now(),
        now()
      from auth.users u
      where (u.id::text like '11111111-1111-4111-8111-%'
          or u.id::text like '22222222-2222-4222-8222-%')
        and not exists (
          select 1
          from auth.identities i
          where i.user_id = u.id and i.provider = 'email'
        )
    $sql$;
  end if;
end
$$;

-- Codes publics lisibles, uniquement pour la démonstration. En production ils
-- sont tirés au hasard par assign_public_code().
update public.profiles set public_code = 'SARAH23456' where id = '22222222-2222-4222-8222-111111111111';
update public.profiles set public_code = 'YACNE23456' where id = '22222222-2222-4222-8222-222222222222';
update public.profiles set public_code = 'AMNE234567' where id = '22222222-2222-4222-8222-333333333333';
update public.profiles set public_code = 'BEKACEM234' where id = '22222222-2222-4222-8222-444444444444';
update public.profiles set public_code = 'HAMD234567' where id = '22222222-2222-4222-8222-555555555555';

update public.profiles set phone = '+213 555 01 02 03' where id = '22222222-2222-4222-8222-111111111111';

-- -----------------------------------------------------------------------------
-- Commerces
-- -----------------------------------------------------------------------------

insert into public.merchants (id, owner_id, name, category, city, phone, join_code, timezone) values
  ('33333333-3333-4333-8333-111111111111', '11111111-1111-4111-8111-111111111111',
   'Burger House', 'fast_food', 'Alger', '+213 21 00 00 01', 'BURGER23', 'Africa/Algiers'),
  ('33333333-3333-4333-8333-222222222222', '11111111-1111-4111-8111-222222222222',
   'Coffee Lab', 'cafe', 'Alger', '+213 21 00 00 02', 'CAFE2345', 'Africa/Algiers'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-333333333333',
   'Beauty Studio', 'beauty', 'Oran', '+213 41 00 00 03', 'BEAUTY23', 'Africa/Algiers');

-- -----------------------------------------------------------------------------
-- Programmes
-- -----------------------------------------------------------------------------
-- Burger House en propose trois, dont un en brouillon : c'est le cas du
-- prototype, et il permet de vérifier qu'un brouillon reste invisible du
-- client et non créditable.

insert into public.programs
  (id, merchant_id, name, emoji, description, threshold, status, surface_color, border_color, sort_order) values
  ('44444444-4444-4444-8444-111111111111', '33333333-3333-4333-8333-111111111111',
   'Burger gratuit', '🍔', 'Burger classique au choix', 10, 'active', '#FDEEE3', '#F6DCC8', 0),
  ('44444444-4444-4444-8444-222222222222', '33333333-3333-4333-8333-111111111111',
   'Pizza offerte', '🍕', 'Pizza medium au choix', 5, 'active', '#FDEEE3', '#F6DCC8', 1),
  ('44444444-4444-4444-8444-333333333333', '33333333-3333-4333-8333-111111111111',
   'Boisson offerte', '🥤', 'Boisson 33 cl au choix', 8, 'draft', '#FDEEE3', '#F6DCC8', 2),
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-222222222222',
   'Café offert', '☕', 'Café de votre choix', 6, 'active', '#EDF1FA', '#DCE3F2', 0),
  ('44444444-4444-4444-8444-555555555555', '33333333-3333-4333-8333-333333333333',
   'Soin offert', '💇', 'Soin du visage ou brushing', 8, 'active', '#F3EDFA', '#E4DAF2', 0);

-- -----------------------------------------------------------------------------
-- Cartes
-- -----------------------------------------------------------------------------

insert into public.memberships (profile_id, merchant_id, joined_at) values
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-111111111111', '2026-03-12 10:00+01'),
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-222222222222', '2026-04-02 09:00+01'),
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-333333333333', '2026-06-18 15:00+01'),
  ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-111111111111', '2026-05-20 12:00+01'),
  ('22222222-2222-4222-8222-333333333333', '33333333-3333-4333-8333-111111111111', '2026-02-01 12:00+01'),
  ('22222222-2222-4222-8222-444444444444', '33333333-3333-4333-8333-111111111111', '2026-09-14 19:00+01'),
  ('22222222-2222-4222-8222-555555555555', '33333333-3333-4333-8333-111111111111', '2026-07-08 13:00+01');

-- -----------------------------------------------------------------------------
-- Historique
-- -----------------------------------------------------------------------------
-- Sarah : 8/10 sur les burgers, une récompense déjà utilisée en août.
-- Le premier cycle de 10 visites est donc suivi d'une consommation, puis de
-- 8 nouvelles visites — le registre raconte une histoire cohérente.

select public.__seed_credits('22222222-2222-4222-8222-111111111111',
                             '44444444-4444-4444-8444-111111111111', 10, '2026-03-12 12:30+01', '12 days');
select public.__seed_redeem ('22222222-2222-4222-8222-111111111111',
                             '44444444-4444-4444-8444-111111111111', '2026-08-12 13:05+01');
select public.__seed_credits('22222222-2222-4222-8222-111111111111',
                             '44444444-4444-4444-8444-111111111111', 8, '2026-08-14 12:40+01', '4 days');

select public.__seed_credits('22222222-2222-4222-8222-111111111111',
                             '44444444-4444-4444-8444-222222222222', 3, '2026-07-05 19:20+01', '18 days');

-- Coffee Lab : 6 visites puis consommation en juillet, puis 4 visites → 4/6.
select public.__seed_credits('22222222-2222-4222-8222-111111111111',
                             '44444444-4444-4444-8444-444444444444', 6, '2026-04-02 08:40+01', '9 days');
select public.__seed_redeem ('22222222-2222-4222-8222-111111111111',
                             '44444444-4444-4444-8444-444444444444', '2026-07-28 10:12+01');
select public.__seed_credits('22222222-2222-4222-8222-111111111111',
                             '44444444-4444-4444-8444-444444444444', 4, '2026-08-01 08:50+01', '9 days');

select public.__seed_credits('22222222-2222-4222-8222-111111111111',
                             '44444444-4444-4444-8444-555555555555', 2, '2026-06-18 15:30+01', '30 days');

-- Autres clients de Burger House. Amine est à 10/10 : sa récompense est
-- disponible mais NON consommée — c'est la règle 2 rendue visible dans le jeu
-- de données, et cela permet de tester l'écran « Récompense disponible ».
select public.__seed_credits('22222222-2222-4222-8222-222222222222',
                             '44444444-4444-4444-8444-111111111111', 3, '2026-05-20 12:30+01', '20 days');
select public.__seed_credits('22222222-2222-4222-8222-333333333333',
                             '44444444-4444-4444-8444-111111111111', 10, '2026-02-01 12:30+01', '20 days');
select public.__seed_credits('22222222-2222-4222-8222-444444444444',
                             '44444444-4444-4444-8444-111111111111', 1, '2026-09-14 19:10+01', '1 day');
select public.__seed_credits('22222222-2222-4222-8222-555555555555',
                             '44444444-4444-4444-8444-111111111111', 6, '2026-07-08 13:30+01', '11 days');

-- -----------------------------------------------------------------------------
-- Notifications déjà reçues par Sarah
-- -----------------------------------------------------------------------------

insert into public.notifications (profile_id, merchant_id, program_id, kind, title, body, data, read_at, pushed_at, created_at) values
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-111111111111',
   '44444444-4444-4444-8444-111111111111', 'visit_credited', '+1 visite',
   'Burger House — Burger gratuit : 8 / 10 visites',
   '{"screen":"card","merchantId":"33333333-3333-4333-8333-111111111111"}'::jsonb,
   null, now() - interval '3 days', '2026-09-12 12:21+01'),
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-222222222222',
   '44444444-4444-4444-8444-444444444444', 'almost_there', 'Plus que 2 visites !',
   'Encore 2 visites avant votre Café offert chez Coffee Lab.',
   '{"screen":"card","merchantId":"33333333-3333-4333-8333-222222222222"}'::jsonb,
   null, now() - interval '30 days', '2026-08-19 18:04+01'),
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-222222222222',
   '44444444-4444-4444-8444-444444444444', 'reward_redeemed', 'Récompense utilisée',
   'Votre Café offert chez Coffee Lab a été utilisée. Nouveau cycle démarré.',
   '{"screen":"rewards","merchantId":"33333333-3333-4333-8333-222222222222"}'::jsonb,
   '2026-07-28 11:00+01', '2026-07-28 10:12+01', '2026-07-28 10:12+01');

-- -----------------------------------------------------------------------------
-- Contrôles de cohérence
-- -----------------------------------------------------------------------------
-- Le jeu de données doit satisfaire les mêmes invariants que la production.

do $$
declare
  v_bad int;
begin
  -- Le solde doit être exactement la somme des deltas du registre.
  select count(*) into v_bad
  from public.program_progress pp
  where pp.stamps <> (
    select coalesce(sum(t.delta), 0)
    from public.transactions t
    where t.profile_id = pp.profile_id and t.program_id = pp.program_id
  );
  if v_bad > 0 then
    raise exception 'Jeu de démonstration : % soldes divergent du registre.', v_bad;
  end if;

  -- Aucune progression sur un programme en brouillon.
  select count(*) into v_bad
  from public.program_progress pp
  join public.programs p on p.id = pp.program_id
  where p.status = 'draft';
  if v_bad > 0 then
    raise exception 'Jeu de démonstration : % progressions sur un brouillon.', v_bad;
  end if;
end
$$;

drop function public.__seed_credits(uuid, uuid, int, timestamptz, interval);
drop function public.__seed_redeem(uuid, uuid, timestamptz);

commit;
