-- Scénarios du portefeuille commun. Tout est annulé en fin de test.
begin;
do $$ begin
  if exists (
    select 1 from public.memberships m where m.points <>
      (select coalesce(sum(delta),0) from public.transactions t where t.profile_id=m.profile_id and t.merchant_id=m.merchant_id)
  ) then raise exception 'Les soldes migrés diffèrent du registre'; end if;
end $$;

-- Fixture : 15 points et trois choix à 5, 10, 15 points.
update public.merchants set min_credit_interval_seconds=300
where id='33333333-3333-4333-8333-111111111111';
update public.programs set threshold=5, status='active'
where id='44444444-4444-4444-8444-111111111111';
update public.programs set threshold=15, status='active'
where id='44444444-4444-4444-8444-222222222222';
insert into public.programs(id,merchant_id,name,emoji,threshold,status)
values('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-111111111111','Menu test','🍟',10,'active');
insert into public.transactions(merchant_id,program_id,profile_id,actor_profile_id,kind,delta,stamps_before,stamps_after,threshold_at_time,client_request_id,source)
select merchant_id,'44444444-4444-4444-8444-111111111111',profile_id,
  '11111111-1111-4111-8111-111111111111','adjust',15-points,points,15,5,gen_random_uuid(),'system'
from public.memberships where profile_id='22222222-2222-4222-8222-111111111111'
and merchant_id='33333333-3333-4333-8333-111111111111' and points<>15;
update public.memberships set last_credit_at=null
where profile_id='22222222-2222-4222-8222-111111111111';

create function pg_temp.assert_balance(expected int) returns void language plpgsql as $$
declare actual int;
begin
  select points into actual from public.memberships
  where profile_id='22222222-2222-4222-8222-111111111111' and merchant_id='33333333-3333-4333-8333-111111111111';
  if actual is distinct from expected then raise exception 'Solde attendu %, obtenu %',expected,actual; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
savepoint starting_points;

-- 3 burgers = 15, rejeu inoffensif, puis refus d'une dépense de plus.
select public.redeem_points('SARAH23456','44444444-4444-4444-8444-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',3);
select pg_temp.assert_balance(0);
select public.redeem_points('SARAH23456','44444444-4444-4444-8444-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',3);
select pg_temp.assert_balance(0);
do $$ begin
  begin perform public.redeem_points('SARAH23456','44444444-4444-4444-8444-222222222222',gen_random_uuid(),1);
    raise exception 'Dépense excessive acceptée';
  exception when others then if sqlerrm <> 'INSUFFICIENT_STAMPS' then raise; end if; end;
  begin perform public.redeem_points('SARAH23456','44444444-4444-4444-8444-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',2);
    raise exception 'Rejeu de quantité différente accepté';
  exception when others then if sqlerrm <> 'REQUEST_ID_CONFLICT' then raise; end if; end;
end $$;
rollback to starting_points;

-- Un menu puis un burger consomment le même portefeuille.
select public.redeem_points('SARAH23456','55555555-5555-4555-8555-555555555555',gen_random_uuid(),1);
select pg_temp.assert_balance(5);
select public.redeem_reward('SARAH23456','44444444-4444-4444-8444-111111111111',gen_random_uuid());
select pg_temp.assert_balance(0);
rollback to starting_points;

-- Une pizza utilise tous les points, sans dépendre d'une ancienne progression.
select public.redeem_points('SARAH23456','44444444-4444-4444-8444-222222222222',gen_random_uuid(),1);
select pg_temp.assert_balance(0);
rollback to starting_points;

-- Surplus conservé, cooldown commun même en changeant de récompense.
select public.credit_visit('SARAH23456','44444444-4444-4444-8444-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select pg_temp.assert_balance(16);
select public.credit_visit('SARAH23456','44444444-4444-4444-8444-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select pg_temp.assert_balance(16);
do $$ begin
  begin perform public.credit_visit('SARAH23456','44444444-4444-4444-8444-222222222222',gen_random_uuid());
    raise exception 'Cooldown contourné';
  exception when others then if sqlerrm <> 'RATE_LIMITED' then raise; end if; end;
  begin perform public.redeem_points('SARAH23456','44444444-4444-4444-8444-111111111111',gen_random_uuid(),0);
    raise exception 'Quantité zéro acceptée';
  exception when others then if sqlerrm <> 'INVALID_COUNT' then raise; end if; end;
end $$;
select public.redeem_points('SARAH23456','44444444-4444-4444-8444-222222222222',gen_random_uuid(),1);
select pg_temp.assert_balance(1);
do $$ begin
  if exists(select 1 from public.resolve_client_for_scan('SARAH23456','33333333-3333-4333-8333-111111111111') where stamps<>1) then
    raise exception 'Les récompenses ne lisent pas le même solde';
  end if;
end $$;

-- Autorisation vérifiée même lors d'un rejeu.
reset role;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.credit_visit('SARAH23456','44444444-4444-4444-8444-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    raise exception 'Rejeu d’un autre commerce accepté';
  exception when others then if sqlerrm <> 'FORBIDDEN' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.redeem_points('SARAH23456','44444444-4444-4444-8444-111111111111',gen_random_uuid(),1);
    raise exception 'Débit par le client accepté';
  exception when others then if sqlerrm <> 'FORBIDDEN' then raise; end if; end;
  begin update public.memberships set points=1000;
    raise exception 'Écriture directe du solde acceptée';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.memberships where profile_id<>auth.uid()) then raise exception 'Isolation client cassée'; end if;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.memberships m where m.points <> (select coalesce(sum(delta),0) from public.transactions t where t.profile_id=m.profile_id and t.merchant_id=m.merchant_id)) then
    raise exception 'Solde final différent du registre';
  end if;
end $$;
rollback;
select 'Portefeuille : combinaisons, quantités, surplus, rejeu, cooldown, RLS et registre OK' as resultat;
