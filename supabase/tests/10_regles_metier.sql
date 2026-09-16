-- =============================================================================
-- Waffiy — vérification des sept règles métier
-- =============================================================================
-- Chaque règle du cahier des charges est vérifiée une par une, en se faisant
-- passer pour un vrai utilisateur : « set role authenticated » plus un JWT
-- simulé. Sans ce changement de rôle, les tests s'exécuteraient en superutilisateur
-- et contourneraient toute la RLS — ils passeraient pour de mauvaises raisons.

\set ON_ERROR_STOP on
\timing off

create temporary table _results (
  ord serial, label text, passed boolean, detail text
);

create function pg_temp.login(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text,
    false
  );
  execute 'set role authenticated';
end;
$$;

create function pg_temp.logout() returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);
end;
$$;

create function pg_temp.check(p_label text, p_passed boolean, p_detail text default null)
returns void language plpgsql security definer as $$
begin
  insert into _results (label, passed, detail) values (p_label, p_passed, p_detail);
end;
$$;

-- Identifiants du jeu de démonstration.
-- psql n'interpole pas ses variables à l'intérieur des blocs $$ : on passe
-- donc par une table et une fonction de résolution, lisibles depuis plpgsql.
create temporary table _ids (name text primary key, id uuid);
insert into _ids (name, id) values
  ('karim', '11111111-1111-4111-8111-111111111111'),
  ('nadir', '11111111-1111-4111-8111-222222222222'),
  ('sarah', '22222222-2222-4222-8222-111111111111'),
  ('yacine', '22222222-2222-4222-8222-222222222222'),
  ('burger', '33333333-3333-4333-8333-111111111111'),
  ('coffee', '33333333-3333-4333-8333-222222222222'),
  ('p_burger', '44444444-4444-4444-8444-111111111111'),
  ('p_draft', '44444444-4444-4444-8444-333333333333'),
  ('p_cafe', '44444444-4444-4444-8444-444444444444');

create function pg_temp.id(p_name text) returns uuid
language sql stable security definer as $fn$
  select id from _ids where name = p_name;
$fn$;

-- =============================================================================
-- RÈGLE 1 — une visite ne peut être créditée que par un commerçant authentifié
-- =============================================================================

do $$
declare v_err text;
begin
  -- 1a. Sarah tente de se créditer elle-même via la fonction.
  perform pg_temp.login(pg_temp.id('sarah'));
  begin
    perform public.credit_visit('SARAH23456', pg_temp.id('p_burger'), gen_random_uuid());
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('R1a — un client ne peut pas se créditer lui-même',
                        v_err = 'FORBIDDEN', v_err);
end $$;

do $$
declare v_err text;
begin
  -- 1b. Sarah tente d'écrire directement dans le registre.
  perform pg_temp.login(pg_temp.id('sarah'));
  begin
    insert into public.transactions (
      merchant_id, program_id, profile_id, actor_profile_id, kind, delta,
      stamps_before, stamps_after, threshold_at_time, client_request_id
    ) values (pg_temp.id('burger'), pg_temp.id('p_burger'), pg_temp.id('sarah'), pg_temp.id('sarah'), 'credit', 1, 8, 9, 10, gen_random_uuid());
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlstate;
  end;
  perform pg_temp.logout();
  -- 42501 = privilège insuffisant. La RLS n'est même pas atteinte : le REVOKE
  -- de la migration 0008 bloque en amont.
  perform pg_temp.check('R1b — écriture directe dans le registre refusée',
                        v_err = '42501', v_err);
end $$;

do $$
declare v_err text;
begin
  -- 1c. Sarah tente de gonfler son propre solde.
  perform pg_temp.login(pg_temp.id('sarah'));
  begin
    update public.program_progress set stamps = 999
    where profile_id = pg_temp.id('sarah') and program_id = pg_temp.id('p_burger');
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlstate;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('R1c — modification directe du solde refusée',
                        v_err = '42501', v_err);
end $$;

do $$
declare v_err text;
begin
  -- 1d. Un commerçant ne peut pas créditer sur le programme d'un confrère.
  perform pg_temp.login(pg_temp.id('karim'));
  begin
    perform public.credit_visit('SARAH23456', pg_temp.id('p_cafe'), gen_random_uuid());
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('R1d — un commerçant ne crédite pas chez un confrère',
                        v_err = 'FORBIDDEN', v_err);
end $$;

-- =============================================================================
-- RÈGLE 6 — délai minimum entre deux crédits (testée avant la 2, qui a besoin
-- de créditer en rafale)
-- =============================================================================

do $$
declare v_err text; v_res public.scan_result;
begin
  perform pg_temp.login(pg_temp.id('karim'));
  -- Premier crédit : Yacine passe de 3 à 4.
  v_res := public.credit_visit('YACNE23456', pg_temp.id('p_burger'), gen_random_uuid());
  -- Second crédit immédiat : doit être refusé.
  begin
    perform public.credit_visit('YACNE23456', pg_temp.id('p_burger'), gen_random_uuid());
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('R6a — second crédit immédiat refusé', v_err = 'RATE_LIMITED', v_err);
  perform pg_temp.check('R6b — le premier crédit a bien eu lieu', v_res.stamps_after = 4,
                        v_res.stamps_after::text);
end $$;

do $$
declare v_before int; v_after int;
begin
  -- Le crédit refusé ne doit RIEN avoir modifié : c'est l'atomicité (règle 7).
  select stamps into v_after from public.program_progress
  where profile_id = pg_temp.id('yacine') and program_id = pg_temp.id('p_burger');
  perform pg_temp.check('R7a — un crédit refusé ne modifie pas le solde', v_after = 4, v_after::text);

  select count(*) into v_before from public.transactions
  where profile_id = pg_temp.id('yacine') and program_id = pg_temp.id('p_burger');
  perform pg_temp.check('R7b — un crédit refusé n''écrit rien au registre', v_before = 4, v_before::text);
end $$;

do $$
declare v_interval int;
begin
  -- Le délai est paramétrable côté serveur, et surchargeable par commerce.
  update public.merchants set min_credit_interval_seconds = 0 where id = pg_temp.id('burger');
  select coalesce(min_credit_interval_seconds, -1) into v_interval
  from public.merchants where id = pg_temp.id('burger');
  perform pg_temp.check('R6c — le délai est surchargeable par commerce', v_interval = 0, v_interval::text);
end $$;

do $$
declare v_err text;
begin
  -- Un commerçant ne doit pas pouvoir lire ni modifier le paramètre global.
  perform pg_temp.login(pg_temp.id('karim'));
  begin
    perform 1 from public.app_settings where key = 'min_credit_interval_seconds';
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlstate;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('R6d — le paramètre global est hors de portée des commerçants',
                        v_err = '42501', v_err);
end $$;

-- =============================================================================
-- RÈGLE 2 — le franchissement du seuil rend la récompense disponible,
-- il ne la consomme jamais
-- =============================================================================

do $$
declare v_res public.scan_result; v_redeems int;
begin
  perform pg_temp.login(pg_temp.id('karim'));
  -- Sarah est à 8/10 : deux crédits l'amènent exactement au seuil.
  perform public.credit_visit('SARAH23456', pg_temp.id('p_burger'), gen_random_uuid());
  v_res := public.credit_visit('SARAH23456', pg_temp.id('p_burger'), gen_random_uuid());
  perform pg_temp.logout();

  perform pg_temp.check('R2a — le seuil est atteint', v_res.stamps_after = 10, v_res.stamps_after::text);
  perform pg_temp.check('R2b — la récompense est signalée disponible', v_res.reward_available, null);

  -- Aucune consommation n'a été enregistrée depuis celle d'août.
  select count(*) into v_redeems from public.transactions
  where profile_id = pg_temp.id('sarah') and program_id = pg_temp.id('p_burger') and kind = 'redeem';
  perform pg_temp.check('R2c — aucune consommation automatique', v_redeems = 1, v_redeems::text);

  -- Et le solde n'a pas été remis à zéro tout seul.
  select stamps into v_redeems from public.program_progress
  where profile_id = pg_temp.id('sarah') and program_id = pg_temp.id('p_burger');
  perform pg_temp.check('R2d — le solde reste à 10, non remis à zéro', v_redeems = 10, v_redeems::text);
end $$;

-- =============================================================================
-- RÈGLE 3 — à la consommation, le surplus est conservé
-- =============================================================================

do $$
declare v_res public.scan_result;
begin
  perform pg_temp.login(pg_temp.id('karim'));
  -- On pousse Sarah à 11/10, le cas exact du cahier des charges.
  v_res := public.credit_visit('SARAH23456', pg_temp.id('p_burger'), gen_random_uuid());
  perform pg_temp.check('R3a — Sarah est à 11 visites pour un seuil de 10',
                        v_res.stamps_after = 11, v_res.stamps_after::text);

  v_res := public.redeem_reward('SARAH23456', pg_temp.id('p_burger'), gen_random_uuid());
  perform pg_temp.logout();

  -- Le cœur de la règle : 11 - 10 = 1, et non 0.
  perform pg_temp.check('R3b — il reste 1 visite après consommation, pas 0',
                        v_res.stamps_after = 1, v_res.stamps_after::text);
  perform pg_temp.check('R3c — la récompense n''est plus disponible',
                        not v_res.reward_available, null);
end $$;

do $$
declare v_lifetime int; v_redeemed int;
begin
  select lifetime_stamps, rewards_redeemed into v_lifetime, v_redeemed
  from public.program_progress where profile_id = pg_temp.id('sarah') and program_id = pg_temp.id('p_burger');
  -- 18 au départ + 3 crédits de test = 21. Le cumul n'est jamais décrémenté.
  perform pg_temp.check('R3d — le cumul historique n''est pas décrémenté',
                        v_lifetime = 21, v_lifetime::text);
  perform pg_temp.check('R3e — le compteur de récompenses est incrémenté',
                        v_redeemed = 2, v_redeemed::text);
end $$;

do $$
declare v_err text;
begin
  -- Consommer sans avoir le solde doit être refusé.
  perform pg_temp.login(pg_temp.id('karim'));
  begin
    perform public.redeem_reward('SARAH23456', pg_temp.id('p_burger'), gen_random_uuid());
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('R3f — consommation refusée sous le seuil',
                        v_err = 'INSUFFICIENT_STAMPS', v_err);
end $$;

-- =============================================================================
-- RÈGLE 4 — avertissement au changement de seuil
-- =============================================================================

do $$
declare v_err text; v_impact record;
begin
  perform pg_temp.login(pg_temp.id('karim'));

  select * into v_impact from public.program_threshold_impact(pg_temp.id('p_burger'), 15);
  perform pg_temp.check('R4a — l''avertissement est exigé : des clients sont inscrits',
                        v_impact.requires_warning, null);
  perform pg_temp.check('R4b — le nombre d''inscrits est chiffré',
                        v_impact.enrolled_count = 5, v_impact.enrolled_count::text);
  -- Amine est à 10/10 : passer le seuil à 15 lui retire sa récompense.
  perform pg_temp.check('R4c — les récompenses retardées sont chiffrées',
                        v_impact.would_delay = 1, v_impact.would_delay::text);

  -- Baisser le seuil à 6 débloquerait Nadia (6/10) et Amine (10/10 déjà dispo).
  select * into v_impact from public.program_threshold_impact(pg_temp.id('p_burger'), 6);
  perform pg_temp.check('R4d — les déblocages immédiats sont chiffrés',
                        v_impact.would_unlock = 1, v_impact.would_unlock::text);

  -- Sans confirmation explicite, le changement est refusé.
  begin
    perform public.set_program_threshold(pg_temp.id('p_burger'), 15);
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.check('R4e — changement refusé sans confirmation',
                        v_err = 'THRESHOLD_CHANGE_REQUIRES_CONFIRMATION', v_err);

  perform pg_temp.logout();
end $$;

do $$
declare v_prog public.programs%rowtype; v_impact record;
begin
  perform pg_temp.login(pg_temp.id('karim'));
  -- Avec confirmation, le changement passe.
  v_prog := public.set_program_threshold(pg_temp.id('p_burger'), 12, true);
  perform pg_temp.check('R4f — changement accepté après confirmation',
                        v_prog.threshold = 12, v_prog.threshold::text);

  -- Sur un programme sans aucun inscrit, aucun avertissement (règle 4, 2e phrase).
  select * into v_impact from public.program_threshold_impact(pg_temp.id('p_draft'), 4);
  perform pg_temp.check('R4g — aucun avertissement si personne n''est inscrit',
                        not v_impact.requires_warning, null);

  v_prog := public.set_program_threshold(pg_temp.id('p_draft'), 4);
  perform pg_temp.check('R4h — seuil modifiable sans confirmation si programme vide',
                        v_prog.threshold = 4, v_prog.threshold::text);

  -- Remise en état pour les tests suivants.
  perform public.set_program_threshold(pg_temp.id('p_burger'), 10, true);
  perform pg_temp.logout();
end $$;

do $$
declare v_thr int;
begin
  -- L'historique ne doit pas être réécrit par le changement de seuil.
  select threshold_at_time into v_thr from public.transactions
  where profile_id = pg_temp.id('sarah') and program_id = pg_temp.id('p_burger') and kind = 'redeem'
  order by created_at limit 1;
  perform pg_temp.check('R4i — le seuil est figé dans l''historique', v_thr = 10, v_thr::text);
end $$;

-- =============================================================================
-- RÈGLE 5 — toute action est horodatée et notifiée
-- =============================================================================

do $$
declare v_res public.scan_result; v_notif record; v_age interval;
begin
  perform pg_temp.login(pg_temp.id('karim'));
  v_res := public.credit_visit('HAMD234567', pg_temp.id('p_burger'), gen_random_uuid());
  perform pg_temp.logout();

  select now() - created_at into v_age from public.transactions where id = v_res.transaction_id;
  perform pg_temp.check('R5a — la transaction est horodatée à l''instant',
                        v_age < interval '10 seconds', v_age::text);

  select * into v_notif from public.notifications
  where transaction_id = v_res.transaction_id;
  perform pg_temp.check('R5b — une notification est créée pour le client',
                        found and v_notif.profile_id = '22222222-2222-4222-8222-555555555555',
                        coalesce(v_notif.title, 'AUCUNE'));
  perform pg_temp.check('R5c — la notification est rédigée en français',
                        v_notif.body like '%Burger House%visites%', v_notif.body);

  -- Attribution : conservée en base pour l'audit, jamais exposée à l'interface
  -- (décision D4 — pas de gestion d'équipe).
  perform pg_temp.check('R5d — l''action est attribuée au compte du commerce',
    (select actor_profile_id from public.transactions where id = v_res.transaction_id) = pg_temp.id('karim'), null);
end $$;

do $$
declare v_kind public.notification_kind; v_res public.scan_result;
begin
  -- Le franchissement du seuil produit une notification de type distinct.
  perform pg_temp.login(pg_temp.id('karim'));
  v_res := public.credit_visit('AMNE234567', pg_temp.id('p_burger'), gen_random_uuid());  -- 10 → 11
  perform pg_temp.logout();
  select kind into v_kind from public.notifications where transaction_id = v_res.transaction_id;
  perform pg_temp.check('R5e — le dépassement du seuil notifie une récompense',
                        v_kind = 'reward_unlocked', v_kind::text);
end $$;

do $$
declare v_kind public.notification_kind; v_res public.scan_result;
begin
  -- Yacine est à 4/10. Le mener à 9/10 doit déclencher « Plus qu'une visite ! ».
  perform pg_temp.login(pg_temp.id('karim'));
  perform public.credit_visit('YACNE23456', pg_temp.id('p_burger'), gen_random_uuid());
  perform public.credit_visit('YACNE23456', pg_temp.id('p_burger'), gen_random_uuid());
  perform public.credit_visit('YACNE23456', pg_temp.id('p_burger'), gen_random_uuid());
  perform public.credit_visit('YACNE23456', pg_temp.id('p_burger'), gen_random_uuid());
  v_res := public.credit_visit('YACNE23456', pg_temp.id('p_burger'), gen_random_uuid());
  perform pg_temp.logout();
  select kind into v_kind from public.notifications where transaction_id = v_res.transaction_id;
  perform pg_temp.check('R5f — « Plus qu''une visite » se déclenche à une visite du but',
                        v_kind = 'almost_there' and v_res.stamps_after = 9,
                        v_kind::text || ' / ' || v_res.stamps_after::text);
end $$;

-- =============================================================================
-- RÈGLE 7 — atomicité et idempotence
-- =============================================================================

do $$
declare v_id uuid := gen_random_uuid(); v_a public.scan_result; v_b public.scan_result; v_n int;
begin
  perform pg_temp.login(pg_temp.id('karim'));
  v_a := public.credit_visit('BEKACEM234', pg_temp.id('p_burger'), v_id);
  v_b := public.credit_visit('BEKACEM234', pg_temp.id('p_burger'), v_id);  -- rejeu
  perform pg_temp.logout();

  perform pg_temp.check('R7c — le rejeu renvoie la même transaction',
                        v_a.transaction_id = v_b.transaction_id, null);
  perform pg_temp.check('R7d — le rejeu est signalé comme tel',
                        not v_a.idempotent_replay and v_b.idempotent_replay, null);
  perform pg_temp.check('R7e — le rejeu ne crédite pas deux fois',
                        v_a.stamps_after = v_b.stamps_after, v_b.stamps_after::text);

  select count(*) into v_n from public.transactions where client_request_id = v_id;
  perform pg_temp.check('R7f — une seule ligne au registre pour deux appels', v_n = 1, v_n::text);
end $$;

do $$
declare v_id uuid := gen_random_uuid(); v_err text;
begin
  -- Une clé d'idempotence ne peut pas être recyclée pour une autre action.
  perform pg_temp.login(pg_temp.id('karim'));
  perform public.credit_visit('HAMD234567', pg_temp.id('p_burger'), v_id);
  begin
    perform public.redeem_reward('HAMD234567', pg_temp.id('p_burger'), v_id);
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('R7g — clé d''idempotence non recyclable',
                        v_err = 'REQUEST_ID_CONFLICT', v_err);
end $$;

do $$
declare v_err text;
begin
  -- Le registre est immuable, y compris pour le superutilisateur.
  begin
    update public.transactions set delta = 99
    where id = (select id from public.transactions limit 1);
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.check('R7h — le registre est immuable même en superutilisateur',
                        v_err like 'Le registre%', left(v_err, 40));
end $$;

do $$
declare v_diff int;
begin
  -- Invariant global : le solde est toujours la somme des deltas du registre.
  select count(*) into v_diff
  from public.program_progress pp
  where pp.stamps <> (
    select coalesce(sum(t.delta), 0) from public.transactions t
    where t.profile_id = pp.profile_id and t.program_id = pp.program_id
  );
  perform pg_temp.check('R7i — tous les soldes découlent du registre', v_diff = 0, v_diff::text);
end $$;

-- =============================================================================
-- Décisions D5 / D6 — inscription
-- =============================================================================

do $$
declare v_err text;
begin
  -- Sarah n'est pas cliente de Beauty Studio via Burger House : on prend un
  -- client sans carte chez Coffee Lab.
  perform pg_temp.login(pg_temp.id('nadir'));
  begin
    perform public.credit_visit('YACNE23456', pg_temp.id('p_cafe'), gen_random_uuid());
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('D5a — crédit refusé si le client n''a pas la carte',
                        v_err = 'NOT_ENROLLED', v_err);
end $$;

do $$
declare v_join public.join_result; v_n int;
begin
  perform pg_temp.login(pg_temp.id('yacine'));
  v_join := public.join_merchant('cafe2345');  -- minuscules : normalisation
  perform pg_temp.logout();

  perform pg_temp.check('D5b — le client rejoint en scannant le QR du commerce',
                        v_join.merchant_name = 'Coffee Lab' and not v_join.already_member, null);
  perform pg_temp.check('D6a — inscription à tous les programmes actifs',
                        v_join.programs_enrolled = 1, v_join.programs_enrolled::text);

  -- Les brouillons sont exclus de l'inscription automatique.
  select count(*) into v_n from public.program_progress pp
  join public.programs p on p.id = pp.program_id
  where pp.profile_id = pg_temp.id('yacine') and p.status = 'draft';
  perform pg_temp.check('D6b — aucun brouillon dans l''inscription', v_n = 0, v_n::text);
end $$;

do $$
declare v_join public.join_result; v_joined timestamptz; v_before timestamptz;
begin
  select joined_at into v_before from public.memberships
  where profile_id = pg_temp.id('yacine') and merchant_id = pg_temp.id('coffee');

  perform pg_temp.login(pg_temp.id('yacine'));
  v_join := public.join_merchant('CAFE2345');  -- rescan
  perform pg_temp.logout();

  select joined_at into v_joined from public.memberships
  where profile_id = pg_temp.id('yacine') and merchant_id = pg_temp.id('coffee');

  perform pg_temp.check('D5c — rescanner ne crée pas de doublon', v_join.already_member, null);
  perform pg_temp.check('D5d — rescanner ne réinitialise pas la date d''adhésion',
                        v_joined = v_before, null);
end $$;

do $$
declare v_err text;
begin
  -- Un commerçant ne peut pas inscrire un client à sa place.
  perform pg_temp.login(pg_temp.id('karim'));
  begin
    insert into public.memberships (profile_id, merchant_id) values (pg_temp.id('sarah'), pg_temp.id('coffee'));
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlstate;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('D5e — un commerçant ne peut pas inscrire un client',
                        v_err in ('42501', '42P17'), v_err);
end $$;

do $$
declare v_err text;
begin
  -- Un programme en brouillon n'est pas créditable (C8).
  perform pg_temp.login(pg_temp.id('karim'));
  begin
    perform public.credit_visit('SARAH23456', pg_temp.id('p_draft'), gen_random_uuid());
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('C8 — un brouillon n''est pas créditable',
                        v_err = 'PROGRAM_NOT_ACTIVE', v_err);
end $$;

-- =============================================================================
-- Isolation des données
-- =============================================================================

do $$
declare v_n int;
begin
  perform pg_temp.login(pg_temp.id('sarah'));
  select count(*) into v_n from public.program_progress where profile_id <> pg_temp.id('sarah');
  perform pg_temp.check('I1 — un client ne voit pas la progression des autres', v_n = 0, v_n::text);

  select count(*) into v_n from public.profiles;
  perform pg_temp.check('I2 — un client ne voit que son propre profil', v_n = 1, v_n::text);

  select count(*) into v_n from public.transactions where profile_id <> pg_temp.id('sarah');
  perform pg_temp.check('I3 — un client ne voit que ses propres transactions', v_n = 0, v_n::text);

  select count(*) into v_n from public.programs where status = 'draft';
  perform pg_temp.check('I4 — un client ne voit pas les programmes en brouillon', v_n = 0, v_n::text);
  perform pg_temp.logout();
end $$;

do $$
declare v_n int; v_cols int;
begin
  perform pg_temp.login(pg_temp.id('karim'));
  select count(*) into v_n from public.merchant_customers where merchant_id <> pg_temp.id('burger');
  perform pg_temp.check('I5 — un commerçant ne voit pas les clients d''un confrère', v_n = 0, v_n::text);

  select count(*) into v_n from public.merchant_customers;
  perform pg_temp.check('I6 — il voit bien ses 5 clients', v_n = 5, v_n::text);

  select count(*) into v_n from public.transactions where merchant_id <> pg_temp.id('burger');
  perform pg_temp.check('I7 — il ne voit pas le registre d''un confrère', v_n = 0, v_n::text);

  -- La vue ne doit pas exposer le téléphone ni l'email de ses clients.
  select count(*) into v_cols from information_schema.columns
  where table_name = 'merchant_customers' and column_name in ('phone', 'email');
  perform pg_temp.check('I8 — la vue clients n''expose ni téléphone ni email', v_cols = 0, v_cols::text);
  perform pg_temp.logout();
end $$;

do $$
declare v_admin boolean; v_status public.merchant_status;
begin
  -- Élévation de privilèges : un client tente de se faire administrateur.
  perform pg_temp.login(pg_temp.id('sarah'));
  update public.profiles set is_platform_admin = true where id = pg_temp.id('sarah');
  perform pg_temp.logout();
  select is_platform_admin into v_admin from public.profiles where id = pg_temp.id('sarah');
  perform pg_temp.check('I9 — un client ne peut pas se faire administrateur', not v_admin, null);

  -- Un commerce suspendu tente de se réactiver.
  update public.merchants set status = 'suspended' where id = pg_temp.id('burger');
  perform pg_temp.login(pg_temp.id('karim'));
  update public.merchants set status = 'active' where id = pg_temp.id('burger');
  perform pg_temp.logout();
  select status into v_status from public.merchants where id = pg_temp.id('burger');
  perform pg_temp.check('I10 — un commerce suspendu ne peut pas se réactiver',
                        v_status = 'suspended', v_status::text);
  update public.merchants set status = 'active' where id = pg_temp.id('burger');
end $$;

do $$
declare v_err text;
begin
  -- resolve_client_for_scan ne doit pas servir d'oracle sur les codes clients.
  perform pg_temp.login(pg_temp.id('nadir'));
  begin
    perform 1 from public.resolve_client_for_scan('SARAH23456', pg_temp.id('burger'));
    v_err := 'AUCUNE ERREUR';
  exception when others then v_err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.check('I11 — la résolution d''un client est bornée à son commerce',
                        v_err = 'FORBIDDEN', v_err);
end $$;

do $$
declare v_row record; v_first record;
begin
  -- Le programme suggéré est celui dont le RATIO de progression est le plus
  -- élevé, pas celui qui compte le plus de tampons (ambiguïté C6).
  perform pg_temp.login(pg_temp.id('karim'));
  select * into v_first from public.resolve_client_for_scan('SARAH23456', pg_temp.id('burger')) limit 1;
  perform pg_temp.logout();

  -- Sarah : burger 1/10 (0,10) contre pizza 3/5 (0,60) → la pizza l'emporte,
  -- alors qu'elle compte moins de tampons en valeur absolue.
  perform pg_temp.check('C6 — le programme suggéré est le plus avancé en ratio',
                        v_first.program_name = 'Pizza offerte' and v_first.is_suggested,
                        v_first.program_name);
end $$;

-- =============================================================================
-- Bilan
-- =============================================================================

\echo ''
select
  lpad(ord::text, 3) || '. ' ||
  case when passed then '  OK  ' else ' ÉCHEC' end || ' — ' || label ||
  case when passed then '' else '   [obtenu : ' || coalesce(detail, 'null') || ']' end
  as "Résultat"
from _results order by ord;

\echo ''
select count(*) filter (where passed) as "réussis",
       count(*) filter (where not passed) as "échoués",
       count(*) as "total"
from _results;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from _results where not passed;
  if v_failed > 0 then
    raise exception '% test(s) en échec.', v_failed;
  end if;
end $$;
