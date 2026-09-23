-- =============================================================================
-- Script d'initialisation : Compte client Sarah avec plusieurs commerces
-- =============================================================================
-- Ce script crée un compte client de test (Sarah Benali) avec des cartes de
-- fidélité chez 3 commerces différents, chacun avec ses propres programmes.
--
-- Utilisation :
-- 1. Aller sur https://supabase.com/dashboard → SQL Editor
-- 2. Copier-coller ce script complet
-- 3. Cliquer sur "Run"
--
-- Identifiants de connexion :
-- Email: sarah.benali@example.dz
-- Mot de passe: WaffiyDemo2026!
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Fonctions utilitaires pour générer des transactions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION __temp_seed_credits(
  p_client   uuid,
  p_program  uuid,
  p_count    int,
  p_first_at timestamptz,
  p_step     interval DEFAULT '6 days'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_program  public.programs%rowtype;
  v_owner    uuid;
  v_before   int;
  v_at       timestamptz;
  i          int;
BEGIN
  SELECT * INTO v_program FROM public.programs WHERE id = p_program;
  SELECT owner_id INTO v_owner FROM public.merchants WHERE id = v_program.merchant_id;

  SELECT COALESCE(stamps, 0) INTO v_before
  FROM public.program_progress
  WHERE profile_id = p_client AND program_id = p_program;
  v_before := COALESCE(v_before, 0);

  FOR i IN 1 .. p_count LOOP
    v_at := p_first_at + (i - 1) * p_step;

    INSERT INTO public.transactions (
      merchant_id, program_id, profile_id, actor_profile_id,
      kind, delta, stamps_before, stamps_after, threshold_at_time,
      client_request_id, source, created_at
    ) VALUES (
      v_program.merchant_id, p_program, p_client, v_owner,
      'credit', 1, v_before, v_before + 1, v_program.threshold,
      gen_random_uuid(), 'scan', v_at
    );

    v_before := v_before + 1;
  END LOOP;

  INSERT INTO public.program_progress (profile_id, program_id, merchant_id, stamps, lifetime_stamps, last_credit_at)
  VALUES (p_client, p_program, v_program.merchant_id, v_before, v_before, v_at)
  ON CONFLICT (profile_id, program_id) DO UPDATE
    SET stamps          = EXCLUDED.stamps,
        lifetime_stamps = public.program_progress.lifetime_stamps + p_count,
        last_credit_at  = EXCLUDED.last_credit_at;

  UPDATE public.memberships
  SET last_activity_at = GREATEST(COALESCE(last_activity_at, v_at), v_at)
  WHERE profile_id = p_client AND merchant_id = v_program.merchant_id;
END;
$$;

CREATE OR REPLACE FUNCTION __temp_seed_redeem(
  p_client  uuid,
  p_program uuid,
  p_at      timestamptz
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_program public.programs%rowtype;
  v_owner   uuid;
  v_before  int;
BEGIN
  SELECT * INTO v_program FROM public.programs WHERE id = p_program;
  SELECT owner_id INTO v_owner FROM public.merchants WHERE id = v_program.merchant_id;

  SELECT stamps INTO v_before
  FROM public.program_progress
  WHERE profile_id = p_client AND program_id = p_program;

  IF v_before IS NULL OR v_before < v_program.threshold THEN
    RAISE EXCEPTION 'Impossible de consommer : % tampons pour un seuil de %.',
      COALESCE(v_before, 0), v_program.threshold;
  END IF;

  INSERT INTO public.transactions (
    merchant_id, program_id, profile_id, actor_profile_id,
    kind, delta, stamps_before, stamps_after, threshold_at_time,
    reward_label, client_request_id, source, created_at
  ) VALUES (
    v_program.merchant_id, p_program, p_client, v_owner,
    'redeem', -v_program.threshold, v_before, v_before - v_program.threshold, v_program.threshold,
    v_program.name, gen_random_uuid(), 'scan', p_at
  );

  UPDATE public.program_progress
  SET stamps           = v_before - v_program.threshold,
      rewards_redeemed = rewards_redeemed + 1
  WHERE profile_id = p_client AND program_id = p_program;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. Créer les comptes commerçants
-- -----------------------------------------------------------------------------

-- Karim - Burger House
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'karim@burgerhouse.dz',
  '{"first_name":"Karim","last_name":"Belhadj"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Nadir - Coffee Lab
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '11111111-1111-4111-8111-222222222222',
  'nadir@coffeelab.dz',
  '{"first_name":"Nadir","last_name":"Slimani"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Yasmine - Beauty Studio
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '11111111-1111-4111-8111-333333333333',
  'yasmine@beautystudio.dz',
  '{"first_name":"Yasmine","last_name":"Cherif"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Créer le compte client Sarah
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '22222222-2222-4222-8222-111111111111',
  'sarah.benali@example.dz',
  '{"first_name":"Sarah","last_name":"Benali"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Configurer les mots de passe et confirmer les emails
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND column_name = 'encrypted_password'
  ) THEN
    -- Mettre à jour tous les comptes créés
    UPDATE auth.users
    SET instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
        aud = 'authenticated',
        role = 'authenticated',
        encrypted_password = crypt('WaffiyDemo2026!', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
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
        created_at = COALESCE(created_at, now()),
        updated_at = now()
    WHERE id::text LIKE '11111111-1111-4111-8111-%'
       OR id::text LIKE '22222222-2222-4222-8222-%';

    -- Créer les identités email
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, created_at, updated_at
    )
    SELECT
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
    FROM auth.users u
    WHERE (u.id::text LIKE '11111111-1111-4111-8111-%'
        OR u.id::text LIKE '22222222-2222-4222-8222-%')
      AND NOT EXISTS (
        SELECT 1
        FROM auth.identities i
        WHERE i.user_id = u.id AND i.provider = 'email'
      );
  END IF;
END
$$;

-- Code public pour Sarah
UPDATE public.profiles
SET public_code = 'SARAH23456',
    phone = '+213 555 01 02 03'
WHERE id = '22222222-2222-4222-8222-111111111111';

-- -----------------------------------------------------------------------------
-- 3. Créer les commerces
-- -----------------------------------------------------------------------------

INSERT INTO public.merchants (id, owner_id, name, category, city, phone, join_code, timezone)
VALUES
  ('33333333-3333-4333-8333-111111111111', '11111111-1111-4111-8111-111111111111',
   'Burger House', 'fast_food', 'Alger', '+213 21 00 00 01', 'BURGER23', 'Africa/Algiers'),
  ('33333333-3333-4333-8333-222222222222', '11111111-1111-4111-8111-222222222222',
   'Coffee Lab', 'cafe', 'Alger', '+213 21 00 00 02', 'CAFE2345', 'Africa/Algiers'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-333333333333',
   'Beauty Studio', 'beauty', 'Oran', '+213 41 00 00 03', 'BEAUTY23', 'Africa/Algiers')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Créer les programmes de fidélité
-- -----------------------------------------------------------------------------

INSERT INTO public.programs
  (id, merchant_id, name, emoji, description, threshold, status, surface_color, border_color, sort_order)
VALUES
  -- Burger House
  ('44444444-4444-4444-8444-111111111111', '33333333-3333-4333-8333-111111111111',
   'Burger gratuit', '🍔', 'Burger classique au choix', 10, 'active', '#FDEEE3', '#F6DCC8', 0),
  ('44444444-4444-4444-8444-222222222222', '33333333-3333-4333-8333-111111111111',
   'Pizza offerte', '🍕', 'Pizza medium au choix', 5, 'active', '#FDEEE3', '#F6DCC8', 1),
  ('44444444-4444-4444-8444-333333333333', '33333333-3333-4333-8333-111111111111',
   'Boisson offerte', '🥤', 'Boisson 33 cl au choix', 8, 'draft', '#FDEEE3', '#F6DCC8', 2),
  -- Coffee Lab
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-222222222222',
   'Café offert', '☕', 'Café de votre choix', 6, 'active', '#EDF1FA', '#DCE3F2', 0),
  -- Beauty Studio
  ('44444444-4444-4444-8444-555555555555', '33333333-3333-4333-8333-333333333333',
   'Soin offert', '💇', 'Soin du visage ou brushing', 8, 'active', '#F3EDFA', '#E4DAF2', 0)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Créer les adhésions (cartes) de Sarah
-- -----------------------------------------------------------------------------

INSERT INTO public.memberships (profile_id, merchant_id, joined_at)
VALUES
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-111111111111', '2026-03-12 10:00:00+01'),
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-222222222222', '2026-04-02 09:00:00+01'),
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-333333333333', '2026-06-18 15:00:00+01')
ON CONFLICT (profile_id, merchant_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. Générer l'historique de visites de Sarah
-- -----------------------------------------------------------------------------

-- Burger House - Programme Burger : 8/10 visites
-- (10 visites → récompense consommée → 8 nouvelles visites)
SELECT __temp_seed_credits(
  '22222222-2222-4222-8222-111111111111',
  '44444444-4444-4444-8444-111111111111',
  10,
  '2026-03-12 12:30:00+01'::timestamptz,
  '12 days'::interval
);

SELECT __temp_seed_redeem(
  '22222222-2222-4222-8222-111111111111',
  '44444444-4444-4444-8444-111111111111',
  '2026-08-12 13:05:00+01'::timestamptz
);

SELECT __temp_seed_credits(
  '22222222-2222-4222-8222-111111111111',
  '44444444-4444-4444-8444-111111111111',
  8,
  '2026-08-14 12:40:00+01'::timestamptz,
  '4 days'::interval
);

-- Burger House - Programme Pizza : 3/5 visites
SELECT __temp_seed_credits(
  '22222222-2222-4222-8222-111111111111',
  '44444444-4444-4444-8444-222222222222',
  3,
  '2026-07-05 19:20:00+01'::timestamptz,
  '18 days'::interval
);

-- Coffee Lab - Programme Café : 4/6 visites
-- (6 visites → récompense consommée → 4 nouvelles visites)
SELECT __temp_seed_credits(
  '22222222-2222-4222-8222-111111111111',
  '44444444-4444-4444-8444-444444444444',
  6,
  '2026-04-02 08:40:00+01'::timestamptz,
  '9 days'::interval
);

SELECT __temp_seed_redeem(
  '22222222-2222-4222-8222-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '2026-07-28 10:12:00+01'::timestamptz
);

SELECT __temp_seed_credits(
  '22222222-2222-4222-8222-111111111111',
  '44444444-4444-4444-8444-444444444444',
  4,
  '2026-08-01 08:50:00+01'::timestamptz,
  '9 days'::interval
);

-- Beauty Studio - Programme Soin : 2/8 visites
SELECT __temp_seed_credits(
  '22222222-2222-4222-8222-111111111111',
  '44444444-4444-4444-8444-555555555555',
  2,
  '2026-06-18 15:30:00+01'::timestamptz,
  '30 days'::interval
);

-- -----------------------------------------------------------------------------
-- 7. Ajouter quelques notifications pour Sarah
-- -----------------------------------------------------------------------------

INSERT INTO public.notifications (profile_id, merchant_id, program_id, kind, title, body, data, read_at, pushed_at, created_at)
VALUES
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-111111111111',
   '44444444-4444-4444-8444-111111111111', 'visit_credited', '+1 visite',
   'Burger House — Burger gratuit : 8 / 10 visites',
   '{"screen":"card","merchantId":"33333333-3333-4333-8333-111111111111"}'::jsonb,
   NULL, now() - interval '3 days', '2026-09-12 12:21:00+01'),
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-222222222222',
   '44444444-4444-4444-8444-444444444444', 'almost_there', 'Plus que 2 visites !',
   'Encore 2 visites avant votre Café offert chez Coffee Lab.',
   '{"screen":"card","merchantId":"33333333-3333-4333-8333-222222222222"}'::jsonb,
   NULL, now() - interval '30 days', '2026-08-19 18:04:00+01'),
  ('22222222-2222-4222-8222-111111111111', '33333333-3333-4333-8333-222222222222',
   '44444444-4444-4444-8444-444444444444', 'reward_redeemed', 'Récompense utilisée',
   'Votre Café offert chez Coffee Lab a été utilisée. Nouveau cycle démarré.',
   '{"screen":"rewards","merchantId":"33333333-3333-4333-8333-222222222222"}'::jsonb,
   '2026-07-28 11:00:00+01', '2026-07-28 10:12:00+01', '2026-07-28 10:12:00+01')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. Nettoyer les fonctions temporaires
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS __temp_seed_credits(uuid, uuid, int, timestamptz, interval);
DROP FUNCTION IF EXISTS __temp_seed_redeem(uuid, uuid, timestamptz);

COMMIT;

-- =============================================================================
-- Résumé de ce qui a été créé
-- =============================================================================
--
-- COMPTE CLIENT SARAH :
-- Email: sarah.benali@example.dz
-- Mot de passe: WaffiyDemo2026!
--
-- CARTES DE FIDÉLITÉ :
--
-- 🍔 Burger House (Karim)
--    • Burger gratuit : 8/10 visites
--    • Pizza offerte : 3/5 visites
--
-- ☕ Coffee Lab (Nadir)
--    • Café offert : 4/6 visites
--
-- 💇 Beauty Studio (Yasmine)
--    • Soin offert : 2/8 visites
--
-- COMPTES COMMERÇANTS :
-- • karim@burgerhouse.dz / WaffiyDemo2026!
-- • nadir@coffeelab.dz / WaffiyDemo2026!
-- • yasmine@beautystudio.dz / WaffiyDemo2026!
--
-- =============================================================================
