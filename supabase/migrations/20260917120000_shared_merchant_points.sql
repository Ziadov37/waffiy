-- Un portefeuille par client et commerce. Les anciennes transactions restent
-- intactes ; leurs deltas constituent le solde initial et la source de vérité.
begin;

alter table public.memberships
  add column points integer not null default 0 check (points >= 0),
  add column lifetime_points integer not null default 0,
  add column rewards_redeemed integer not null default 0,
  add column last_credit_at timestamptz;

update public.memberships m set
  points = b.points, lifetime_points = b.earned,
  rewards_redeemed = b.rewards, last_credit_at = b.last_credit
from (
  select profile_id, merchant_id, sum(delta)::int points,
    coalesce(sum(delta) filter (where kind = 'credit'), 0)::int earned,
    count(*) filter (where kind = 'redeem')::int rewards,
    max(created_at) filter (where kind = 'credit') last_credit
  from public.transactions group by profile_id, merchant_id
) b where m.profile_id = b.profile_id and m.merchant_id = b.merchant_id;

revoke insert, update, delete on public.memberships from anon, authenticated;

create function public.apply_wallet_transaction() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.memberships set
    points = points + new.delta,
    lifetime_points = lifetime_points + case when new.kind = 'credit' then new.delta else 0 end,
    rewards_redeemed = rewards_redeemed + case when new.kind = 'redeem' then (-new.delta / new.threshold_at_time) else 0 end,
    last_credit_at = case when new.kind = 'credit' then greatest(last_credit_at, new.created_at) else last_credit_at end,
    last_activity_at = greatest(last_activity_at, new.created_at)
  where profile_id = new.profile_id and merchant_id = new.merchant_id;
  if not found then raise exception 'NOT_ENROLLED'; end if;
  return new;
end;
$$;
revoke all on function public.apply_wallet_transaction() from public, anon, authenticated;
create trigger transactions_update_wallet after insert on public.transactions
for each row execute function public.apply_wallet_transaction();

-- Point d'écriture commun : verrou de requête, puis verrou du portefeuille.
-- Deux récompenses différentes ne peuvent jamais dépenser les mêmes points.
create function public.spend_or_credit_points(
  p_client_code text, p_program_id uuid, p_request_id uuid,
  p_kind public.transaction_kind, p_count int
) returns public.scan_result
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  pg public.programs%rowtype;
  shop public.merchants%rowtype;
  wallet public.memberships%rowtype;
  previous public.transactions%rowtype;
  client uuid;
  amount int;
  cooldown int;
  txn uuid;
begin
  if p_request_id is null then raise exception 'MISSING_REQUEST_ID'; end if;
  select * into pg from public.programs where id = p_program_id for share;
  if not found then raise exception 'PROGRAM_NOT_FOUND'; end if;
  if auth.uid() is null or not public.auth_is_merchant_operator(pg.merchant_id) then
    raise exception 'FORBIDDEN';
  end if;
  select * into shop from public.merchants where id = pg.merchant_id;
  select id into client from public.profiles
  where public_code = upper(translate(btrim(p_client_code), '- ', '')) and deleted_at is null;
  if client is null then raise exception 'CLIENT_NOT_FOUND'; end if;
  if p_kind not in ('credit', 'redeem') or p_count is null or p_count < 1 or p_count > 100 then
    raise exception 'INVALID_COUNT';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into previous from public.transactions where client_request_id = p_request_id;
  if found then
    if previous.profile_id <> client or previous.program_id <> pg.id or previous.kind <> p_kind
      or (p_kind = 'credit' and previous.delta <> p_count)
      or (p_kind = 'redeem' and -previous.delta <> previous.threshold_at_time * p_count) then
      raise exception 'REQUEST_ID_CONFLICT';
    end if;
    return (previous.id, pg.merchant_id, pg.id, pg.name, previous.stamps_after,
      previous.threshold_at_time, previous.stamps_after >= previous.threshold_at_time, true)::public.scan_result;
  end if;
  if shop.status <> 'active' then raise exception 'MERCHANT_SUSPENDED'; end if;
  if pg.status <> 'active' then raise exception 'PROGRAM_NOT_ACTIVE'; end if;
  select * into wallet from public.memberships
  where profile_id = client and merchant_id = pg.merchant_id for update;
  if not found then raise exception 'NOT_ENROLLED'; end if;
  if p_kind = 'credit' then
    if p_count > public.app_setting_int('max_credit_per_call', 1) then raise exception 'INVALID_COUNT'; end if;
    cooldown := coalesce(shop.min_credit_interval_seconds, public.app_setting_int('min_credit_interval_seconds', 300));
    if wallet.last_credit_at is not null and now() < wallet.last_credit_at + make_interval(secs => cooldown) then
      raise exception 'RATE_LIMITED' using detail = ceil(extract(epoch from wallet.last_credit_at + make_interval(secs => cooldown) - now()))::text;
    end if;
    amount := p_count;
  else
    amount := -pg.threshold * p_count;
    if wallet.points + amount < 0 then raise exception 'INSUFFICIENT_STAMPS'; end if;
  end if;
  insert into public.transactions (
    merchant_id, program_id, profile_id, actor_profile_id, kind, delta,
    stamps_before, stamps_after, threshold_at_time, reward_label, client_request_id, source
  ) values (
    pg.merchant_id, pg.id, client, auth.uid(), p_kind, amount,
    wallet.points, wallet.points + amount, pg.threshold,
    case when p_kind = 'redeem' then format('%s × %s', p_count, pg.name) end, p_request_id, 'scan'
  ) returning id into txn;
  insert into public.notifications (profile_id, merchant_id, program_id, transaction_id, kind, title, body, data)
  values (client, pg.merchant_id, pg.id, txn,
    case when p_kind = 'credit' then 'visit_credited'::public.notification_kind else 'reward_redeemed'::public.notification_kind end,
    case when p_kind = 'credit' then format('+%s point', p_count) else 'Récompense utilisée' end,
    format('%s — solde : %s points', shop.name, wallet.points + amount),
    jsonb_build_object('screen', 'card', 'merchantId', shop.id));
  return (txn, pg.merchant_id, pg.id, pg.name, wallet.points + amount,
    pg.threshold, wallet.points + amount >= pg.threshold, false)::public.scan_result;
end;
$$;
revoke all on function public.spend_or_credit_points(text, uuid, uuid, public.transaction_kind, int) from public, anon, authenticated;

create or replace function public.credit_visit(p_client_code text, p_program_id uuid, p_request_id uuid, p_count int default 1)
returns public.scan_result language sql security definer set search_path = public, pg_temp as $$
  select public.spend_or_credit_points(p_client_code, p_program_id, p_request_id, 'credit', p_count);
$$;
create or replace function public.redeem_reward(p_client_code text, p_program_id uuid, p_request_id uuid)
returns public.scan_result language sql security definer set search_path = public, pg_temp as $$
  select public.spend_or_credit_points(p_client_code, p_program_id, p_request_id, 'redeem', 1);
$$;
create function public.redeem_points(p_client_code text, p_program_id uuid, p_request_id uuid, p_quantity int default 1)
returns public.scan_result language sql security definer set search_path = public, pg_temp as $$
  select public.spend_or_credit_points(p_client_code, p_program_id, p_request_id, 'redeem', p_quantity);
$$;
revoke all on function public.redeem_points(text, uuid, uuid, int) from public, anon;
grant execute on function public.redeem_points(text, uuid, uuid, int) to authenticated;

create or replace function public.resolve_client_for_scan(p_client_code text, p_merchant_id uuid)
returns table (
  client_profile_id uuid, client_first_name text, client_last_name text, client_public_code text,
  client_joined_at timestamptz, is_enrolled boolean, total_visits int, rewards_redeemed int,
  program_id uuid, program_name text, program_emoji text, program_threshold int,
  stamps int, reward_available boolean, is_suggested boolean, seconds_until_next_credit int
) language plpgsql stable security definer set search_path = public, pg_temp as $$
declare client public.profiles%rowtype; wallet public.memberships%rowtype; cooldown int;
begin
  if auth.uid() is null or not public.auth_is_merchant_operator(p_merchant_id) then raise exception 'FORBIDDEN'; end if;
  select * into client from public.profiles
  where public_code = upper(translate(btrim(p_client_code), '- ', '')) and deleted_at is null;
  if not found then raise exception 'CLIENT_NOT_FOUND'; end if;
  select * into wallet from public.memberships where profile_id = client.id and merchant_id = p_merchant_id;
  select coalesce(min_credit_interval_seconds, public.app_setting_int('min_credit_interval_seconds', 300))
    into cooldown from public.merchants where id = p_merchant_id;
  return query select client.id, client.first_name, client.last_name, client.public_code,
    wallet.joined_at, wallet.id is not null, coalesce(wallet.lifetime_points,0), coalesce(wallet.rewards_redeemed,0),
    p.id, p.name, p.emoji, p.threshold, coalesce(wallet.points,0), coalesce(wallet.points,0) >= p.threshold,
    row_number() over (order by p.threshold, p.sort_order, p.name) = 1,
    case when wallet.last_credit_at is null then 0 else greatest(0, ceil(extract(epoch from wallet.last_credit_at + make_interval(secs => cooldown) - now()))::int) end
  from public.programs p where p.merchant_id = p_merchant_id and p.status = 'active'
  order by p.threshold, p.sort_order, p.name;
end;
$$;

create or replace view public.merchant_customers with (security_invoker = false) as
select m.merchant_id, m.profile_id, m.joined_at, m.last_activity_at,
  p.first_name, p.last_name, p.public_code, p.avatar_url,
  m.lifetime_points as total_visits, m.rewards_redeemed,
  exists(select 1 from public.programs pg where pg.merchant_id = m.merchant_id and pg.status = 'active' and pg.threshold <= m.points) as has_reward_available
from public.memberships m join public.profiles p on p.id = m.profile_id
where public.auth_is_merchant_operator(m.merchant_id) or public.auth_is_platform_admin();

create or replace function public.program_threshold_impact(p_program_id uuid, p_threshold int)
returns table(current_threshold int, enrolled_count int, in_progress_count int, would_unlock int, would_delay int, requires_warning boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare pg public.programs%rowtype;
begin
  select * into pg from public.programs where id = p_program_id;
  if not found then raise exception 'PROGRAM_NOT_FOUND'; end if;
  if not public.auth_is_merchant_operator(pg.merchant_id) then raise exception 'FORBIDDEN'; end if;
  return query select pg.threshold, count(*)::int, count(*) filter(where m.points > 0)::int,
    count(*) filter(where m.points < pg.threshold and m.points >= p_threshold)::int,
    count(*) filter(where m.points >= pg.threshold and m.points < p_threshold)::int, count(*) > 0
  from public.memberships m where m.merchant_id = pg.merchant_id;
end;
$$;

create or replace function public.set_program_threshold(p_program_id uuid, p_threshold int, p_confirmed boolean default false)
returns public.programs language plpgsql security definer set search_path = public, pg_temp as $$
declare pg public.programs%rowtype;
begin
  select * into pg from public.programs where id = p_program_id for update;
  if not found then raise exception 'PROGRAM_NOT_FOUND'; end if;
  if not public.auth_is_merchant_operator(pg.merchant_id) then raise exception 'FORBIDDEN'; end if;
  if p_threshold is null or p_threshold < 2 or p_threshold > 50 then raise exception 'INVALID_THRESHOLD'; end if;
  if p_threshold = pg.threshold then return pg; end if;
  if not p_confirmed and exists(select 1 from public.memberships where merchant_id = pg.merchant_id) then
    raise exception 'THRESHOLD_CHANGE_REQUIRES_CONFIRMATION';
  end if;
  update public.programs set threshold = p_threshold where id = p_program_id returning * into pg;
  return pg;
end;
$$;

create or replace function public.merchant_stats(p_merchant uuid)
returns table (
  customers_count   int,
  scans_today       int,
  rewards_this_month int,
  returning_rate    int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz         text;
  v_day_start  timestamptz;
  v_month_start timestamptz;
begin
  if not public.auth_is_merchant_operator(p_merchant)
     and not public.auth_is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select timezone into v_tz from public.merchants where id = p_merchant;
  if v_tz is null then
    raise exception 'MERCHANT_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Minuit et premier du mois, lus dans le fuseau du commerce puis reconvertis
  -- en instant absolu pour la comparaison.
  v_day_start   := (date_trunc('day',   now() at time zone v_tz)) at time zone v_tz;
  v_month_start := (date_trunc('month', now() at time zone v_tz)) at time zone v_tz;

  return query
  select
    (select count(*)::int from public.memberships m where m.merchant_id = p_merchant),

    (select count(*)::int from public.transactions t
      where t.merchant_id = p_merchant
        and t.kind = 'credit'
        and t.created_at >= v_day_start),

    (select coalesce(sum(-t.delta / t.threshold_at_time), 0)::int from public.transactions t
      where t.merchant_id = p_merchant
        and t.kind = 'redeem'
        and t.created_at >= v_month_start),

    -- « Clients fidèles » : part des clients revenus au moins une fois, donc
    -- ayant cumulé 2 visites ou plus. Un client à une seule visite n'a pas
    -- encore prouvé qu'il revenait.
    (select case
       when count(distinct mm.profile_id) = 0 then 0
       else round(
         100.0 * count(distinct mm.profile_id) filter (where loyal.total >= 2)
         / count(distinct mm.profile_id)
       )::int
     end
     from public.memberships mm
     left join lateral (
       select coalesce(sum(pp.lifetime_points), 0) as total
       from public.memberships pp
       where pp.profile_id = mm.profile_id and pp.merchant_id = p_merchant
     ) loyal on true
     where mm.merchant_id = p_merchant);
end;
$$;

alter publication supabase_realtime add table public.memberships;
alter publication supabase_realtime add table public.programs;
alter table public.memberships replica identity full;
alter table public.programs replica identity full;

commit;
