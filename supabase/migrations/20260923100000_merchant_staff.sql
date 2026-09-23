-- =============================================================================
-- Waffiy — Accès caissiers séparés, sessions PIN révocables et audit
-- =============================================================================

begin;

create table public.merchant_staff (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 80),
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index merchant_staff_merchant_idx
  on public.merchant_staff (merchant_id, active, created_at);

create trigger merchant_staff_set_updated_at
  before update on public.merchant_staff
  for each row execute function public.set_updated_at();

create table public.merchant_staff_sessions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  staff_id uuid not null references public.merchant_staff (id) on delete cascade,
  token_hash text not null unique,
  device_label text check (device_label is null or length(device_label) <= 100),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index merchant_staff_sessions_validation_idx
  on public.merchant_staff_sessions (token_hash, merchant_id, expires_at)
  where revoked_at is null;

alter table public.merchant_staff enable row level security;
alter table public.merchant_staff_sessions enable row level security;

-- Aucune lecture directe : le hash du PIN et celui du jeton ne doivent jamais
-- quitter Postgres. Toute la gestion passe par les fonctions filtrées ci-dessous.
revoke all on public.merchant_staff from anon, authenticated;
revoke all on public.merchant_staff_sessions from anon, authenticated;

alter table public.transactions
  add column actor_staff_id uuid references public.merchant_staff (id) on delete restrict;

comment on column public.transactions.actor_staff_id is
  'Caissier ayant réalisé l’opération. NULL signifie que le propriétaire l’a réalisée.';

create or replace function public.list_merchant_staff(p_merchant uuid)
returns table (
  id uuid,
  merchant_id uuid,
  name text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  revoked_at timestamptz
)
language plpgsql stable security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not exists (
    select 1 from public.merchants m
    where m.id = p_merchant and m.owner_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select s.id, s.merchant_id, s.name, s.active,
         s.created_at, s.updated_at, s.revoked_at
  from public.merchant_staff s
  where s.merchant_id = p_merchant
  order by s.active desc, s.created_at asc;
end;
$$;

create or replace function public.create_merchant_staff(
  p_merchant uuid,
  p_name text,
  p_pin text
)
returns table (
  id uuid,
  merchant_id uuid,
  name text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  revoked_at timestamptz
)
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  created public.merchant_staff%rowtype;
begin
  if not exists (
    select 1 from public.merchants m
    where m.id = p_merchant and m.owner_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;
  if length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'INVALID_STAFF_NAME';
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    raise exception 'INVALID_STAFF_PIN';
  end if;
  if exists (
    select 1 from public.merchant_staff s
    where s.merchant_id = p_merchant
      and s.active
      and s.pin_hash = extensions.crypt(p_pin, s.pin_hash)
  ) then
    raise exception 'STAFF_PIN_ALREADY_USED';
  end if;
  if (select count(*) from public.merchant_staff s
      where s.merchant_id = p_merchant and s.active) >= 20 then
    raise exception 'STAFF_LIMIT_REACHED';
  end if;

  insert into public.merchant_staff (merchant_id, name, pin_hash)
  values (p_merchant, btrim(p_name), extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  returning * into created;

  return query select created.id, created.merchant_id, created.name, created.active,
                      created.created_at, created.updated_at, created.revoked_at;
end;
$$;

create or replace function public.set_merchant_staff_active(
  p_staff uuid,
  p_active boolean
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  target public.merchant_staff%rowtype;
begin
  select * into target from public.merchant_staff where id = p_staff for update;
  if not found or not exists (
    select 1 from public.merchants m
    where m.id = target.merchant_id and m.owner_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  update public.merchant_staff
  set active = p_active,
      revoked_at = case when p_active then null else now() end
  where id = p_staff;

  if not p_active then
    update public.merchant_staff_sessions
    set revoked_at = coalesce(revoked_at, now())
    where staff_id = p_staff and revoked_at is null;
  end if;
end;
$$;

create or replace function public.change_merchant_staff_pin(
  p_staff uuid,
  p_pin text
)
returns void
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  target public.merchant_staff%rowtype;
begin
  select * into target from public.merchant_staff where id = p_staff for update;
  if not found or not exists (
    select 1 from public.merchants m
    where m.id = target.merchant_id and m.owner_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    raise exception 'INVALID_STAFF_PIN';
  end if;
  if exists (
    select 1 from public.merchant_staff s
    where s.merchant_id = target.merchant_id and s.id <> p_staff and s.active
      and s.pin_hash = extensions.crypt(p_pin, s.pin_hash)
  ) then
    raise exception 'STAFF_PIN_ALREADY_USED';
  end if;

  update public.merchant_staff
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10))
  where id = p_staff;

  update public.merchant_staff_sessions
  set revoked_at = coalesce(revoked_at, now())
  where staff_id = p_staff and revoked_at is null;
end;
$$;

create or replace function public.open_merchant_staff_session(
  p_merchant uuid,
  p_pin text,
  p_device_label text default null
)
returns table (
  session_token text,
  staff_id uuid,
  staff_name text,
  expires_at timestamptz
)
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  staff public.merchant_staff%rowtype;
  raw_token text;
  expiry timestamptz := now() + interval '12 hours';
begin
  -- L'appareil doit déjà être ouvert par le propriétaire. Le PIN choisit le
  -- caissier sans redonner accès à un autre commerce.
  if not exists (
    select 1 from public.merchants m
    where m.id = p_merchant and m.owner_id = auth.uid() and m.status = 'active'
  ) then
    raise exception 'FORBIDDEN';
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    raise exception 'INVALID_STAFF_PIN';
  end if;

  select * into staff
  from public.merchant_staff s
  where s.merchant_id = p_merchant and s.active
    and s.pin_hash = extensions.crypt(p_pin, s.pin_hash)
  limit 1;

  if not found then raise exception 'INVALID_STAFF_PIN'; end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.merchant_staff_sessions (
    merchant_id, staff_id, token_hash, device_label, expires_at
  ) values (
    p_merchant, staff.id,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    nullif(left(btrim(coalesce(p_device_label, '')), 100), ''),
    expiry
  );

  return query select raw_token, staff.id, staff.name, expiry;
end;
$$;

create or replace function public.close_merchant_staff_session(p_session_token text)
returns void
language sql security definer
set search_path = public, extensions, pg_temp
as $$
  update public.merchant_staff_sessions
  set revoked_at = coalesce(revoked_at, now())
  where token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex');
$$;

-- Renvoie le caissier autorisé, NULL pour le propriétaire, et lève une erreur
-- pour toute autre combinaison. La session est relue à chaque opération : une
-- révocation prend donc effet sans attendre l'expiration locale du jeton.
create or replace function public.authorize_merchant_operation(
  p_merchant uuid,
  p_staff_session_token text default null
)
returns uuid
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  staff_id uuid;
begin
  if p_staff_session_token is null then
    if exists (
      select 1 from public.merchants m
      where m.id = p_merchant and m.owner_id = auth.uid()
    ) then
      return null;
    end if;
    raise exception 'FORBIDDEN';
  end if;

  select s.staff_id into staff_id
  from public.merchant_staff_sessions s
  join public.merchant_staff ms on ms.id = s.staff_id
  where s.merchant_id = p_merchant
    and s.token_hash = encode(extensions.digest(p_staff_session_token, 'sha256'), 'hex')
    and s.revoked_at is null
    and s.expires_at > now()
    and ms.active;

  if staff_id is null then raise exception 'STAFF_SESSION_INVALID'; end if;

  update public.merchant_staff_sessions
  set last_used_at = now()
  where token_hash = encode(extensions.digest(p_staff_session_token, 'sha256'), 'hex');
  return staff_id;
end;
$$;

revoke all on function public.authorize_merchant_operation(uuid, text)
  from public, anon, authenticated;

-- Remplace le point d'écriture afin d'associer l'opération au caissier.
drop function public.credit_visit(text, uuid, uuid, int);
drop function public.redeem_reward(text, uuid, uuid);
drop function public.redeem_points(text, uuid, uuid, int);
drop function public.spend_or_credit_points(text, uuid, uuid, public.transaction_kind, int);

create function public.spend_or_credit_points(
  p_client_code text,
  p_program_id uuid,
  p_request_id uuid,
  p_kind public.transaction_kind,
  p_count int,
  p_staff_session_token text default null
) returns public.scan_result
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  pg public.programs%rowtype;
  shop public.merchants%rowtype;
  wallet public.memberships%rowtype;
  previous public.transactions%rowtype;
  client uuid;
  amount int;
  cooldown int;
  txn uuid;
  staff_id uuid;
begin
  if p_request_id is null then raise exception 'MISSING_REQUEST_ID'; end if;
  select * into pg from public.programs where id = p_program_id for share;
  if not found then raise exception 'PROGRAM_NOT_FOUND'; end if;
  staff_id := public.authorize_merchant_operation(pg.merchant_id, p_staff_session_token);
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
      raise exception 'RATE_LIMITED'
        using detail = ceil(extract(epoch from wallet.last_credit_at + make_interval(secs => cooldown) - now()))::text;
    end if;
    amount := p_count;
  else
    amount := -pg.threshold * p_count;
    if wallet.points + amount < 0 then raise exception 'INSUFFICIENT_STAMPS'; end if;
  end if;
  insert into public.transactions (
    merchant_id, program_id, profile_id, actor_profile_id, actor_staff_id, kind, delta,
    stamps_before, stamps_after, threshold_at_time, reward_label, client_request_id, source
  ) values (
    pg.merchant_id, pg.id, client, shop.owner_id, staff_id, p_kind, amount,
    wallet.points, wallet.points + amount, pg.threshold,
    case when p_kind = 'redeem' then format('%s × %s', p_count, pg.name) end,
    p_request_id, 'scan'
  ) returning id into txn;
  insert into public.notifications (
    profile_id, merchant_id, program_id, transaction_id, kind, title, body, data
  ) values (
    client, pg.merchant_id, pg.id, txn,
    case when p_kind = 'credit' then 'visit_credited'::public.notification_kind
         else 'reward_redeemed'::public.notification_kind end,
    case when p_kind = 'credit' then format('+%s point', p_count)
         else 'Récompense utilisée' end,
    format('%s — solde : %s points', shop.name, wallet.points + amount),
    jsonb_build_object('screen', 'card', 'merchantId', shop.id)
  );
  return (txn, pg.merchant_id, pg.id, pg.name, wallet.points + amount,
    pg.threshold, wallet.points + amount >= pg.threshold, false)::public.scan_result;
end;
$$;

create function public.credit_visit(
  p_client_code text,
  p_program_id uuid,
  p_request_id uuid,
  p_count int default 1,
  p_staff_session_token text default null
)
returns public.scan_result language sql security definer
set search_path = public, pg_temp
as $$
  select public.spend_or_credit_points(
    p_client_code, p_program_id, p_request_id, 'credit', p_count, p_staff_session_token
  );
$$;

create function public.redeem_reward(
  p_client_code text,
  p_program_id uuid,
  p_request_id uuid,
  p_staff_session_token text default null
)
returns public.scan_result language sql security definer
set search_path = public, pg_temp
as $$
  select public.spend_or_credit_points(
    p_client_code, p_program_id, p_request_id, 'redeem', 1, p_staff_session_token
  );
$$;

create function public.redeem_points(
  p_client_code text,
  p_program_id uuid,
  p_request_id uuid,
  p_quantity int default 1,
  p_staff_session_token text default null
)
returns public.scan_result language sql security definer
set search_path = public, pg_temp
as $$
  select public.spend_or_credit_points(
    p_client_code, p_program_id, p_request_id, 'redeem', p_quantity, p_staff_session_token
  );
$$;

revoke all on function public.spend_or_credit_points(text, uuid, uuid, public.transaction_kind, int, text)
  from public, anon, authenticated;
revoke all on function public.credit_visit(text, uuid, uuid, int, text) from public, anon;
revoke all on function public.redeem_reward(text, uuid, uuid, text) from public, anon;
revoke all on function public.redeem_points(text, uuid, uuid, int, text) from public, anon;
grant execute on function public.credit_visit(text, uuid, uuid, int, text) to authenticated;
grant execute on function public.redeem_reward(text, uuid, uuid, text) to authenticated;
grant execute on function public.redeem_points(text, uuid, uuid, int, text) to authenticated;

-- Le nom de l'opérateur est utile au commerçant, sans exposer aucun secret.
create or replace view public.merchant_activity
with (security_invoker = false)
as
select
  t.id,
  t.merchant_id,
  t.profile_id,
  p.first_name,
  p.last_name,
  t.program_id,
  pg.name as program_name,
  pg.emoji as program_emoji,
  t.kind,
  t.delta,
  t.stamps_before,
  t.stamps_after,
  t.threshold_at_time,
  t.reward_label,
  t.source,
  t.created_at,
  t.actor_staff_id,
  coalesce(ms.name, nullif(btrim(op.first_name || ' ' || op.last_name), ''), 'Propriétaire')
    as operator_name
from public.transactions t
join public.profiles p on p.id = t.profile_id
join public.programs pg on pg.id = t.program_id
join public.profiles op on op.id = t.actor_profile_id
left join public.merchant_staff ms on ms.id = t.actor_staff_id
where public.auth_is_merchant_operator(t.merchant_id)
   or public.auth_is_platform_admin();

revoke all on public.merchant_activity from anon;
grant select on public.merchant_activity to authenticated;

revoke all on function public.list_merchant_staff(uuid) from public, anon;
revoke all on function public.create_merchant_staff(uuid, text, text) from public, anon;
revoke all on function public.set_merchant_staff_active(uuid, boolean) from public, anon;
revoke all on function public.change_merchant_staff_pin(uuid, text) from public, anon;
revoke all on function public.open_merchant_staff_session(uuid, text, text) from public, anon;
revoke all on function public.close_merchant_staff_session(text) from public, anon;
grant execute on function public.list_merchant_staff(uuid) to authenticated;
grant execute on function public.create_merchant_staff(uuid, text, text) to authenticated;
grant execute on function public.set_merchant_staff_active(uuid, boolean) to authenticated;
grant execute on function public.change_merchant_staff_pin(uuid, text) to authenticated;
grant execute on function public.open_merchant_staff_session(uuid, text, text) to authenticated;
grant execute on function public.close_merchant_staff_session(text) to authenticated;

commit;
