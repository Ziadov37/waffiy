-- =============================================================================
-- Waffiy — 0013 · Publication temps réel
-- =============================================================================
-- Le client regarde souvent sa carte au moment précis où le commerçant scanne.
-- Sans temps réel, il verrait 8/10 pendant que le commerçant annonce 9/10 —
-- exactement le genre d'écart qui crée une discussion au comptoir.
--
-- Seules deux tables sont publiées, et Supabase applique la RLS aux messages
-- temps réel : un client ne reçoit que SES changements.
--
-- program_progress et notifications suffisent. Publier transactions n'ajouterait
-- rien de visible et doublerait le trafic, chaque crédit produisant déjà une
-- ligne dans les deux autres.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

alter publication supabase_realtime add table public.program_progress;
alter publication supabase_realtime add table public.notifications;

-- REPLICA IDENTITY FULL : sans cela, un UPDATE ne transmet que les colonnes de
-- la clé primaire dans l'ancienne version de la ligne. L'application ne pourrait
-- pas savoir que c'est le solde qui a changé.
alter table public.program_progress replica identity full;
alter table public.notifications replica identity full;
