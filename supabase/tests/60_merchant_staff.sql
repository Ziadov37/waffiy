begin;

update public.merchants
set min_credit_interval_seconds = 0
where id = '33333333-3333-4333-8333-111111111111';

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

create temp table staff_test_session(token text, staff_id uuid);

select public.create_merchant_staff(
  '33333333-3333-4333-8333-111111111111', 'Nadia', '2468'
);
select public.create_merchant_staff(
  '33333333-3333-4333-8333-111111111111', 'Samir', '1357'
);

do $$
begin
  if (select count(*) from public.list_merchant_staff(
      '33333333-3333-4333-8333-111111111111'
    ) where active) <> 2 then
    raise exception 'Les deux caissiers actifs ne sont pas listés';
  end if;

  begin
    perform public.create_merchant_staff(
      '33333333-3333-4333-8333-111111111111', 'PIN dupliqué', '2468'
    );
    raise exception 'Un PIN actif dupliqué a été accepté';
  exception when others then
    if sqlerrm <> 'STAFF_PIN_ALREADY_USED' then raise; end if;
  end;
end $$;

insert into staff_test_session(token, staff_id)
select session_token, staff_id
from public.open_merchant_staff_session(
  '33333333-3333-4333-8333-111111111111', '2468', 'Caisse test'
);

select public.credit_visit(
  'SARAH23456',
  '44444444-4444-4444-8444-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  1,
  (select token from staff_test_session)
);

do $$
begin
  if not exists (
    select 1
    from public.merchant_activity a
    where a.id = (
      select t.id from public.transactions t
      where t.client_request_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    )
      and a.actor_staff_id = (select staff_id from staff_test_session)
      and a.operator_name = 'Nadia'
  ) then
    raise exception 'Le caissier n’est pas présent dans l’audit';
  end if;
end $$;

select public.set_merchant_staff_active(
  (select staff_id from staff_test_session), false
);

do $$
begin
  begin
    perform public.credit_visit(
      'SARAH23456',
      '44444444-4444-4444-8444-111111111111',
      gen_random_uuid(),
      1,
      (select token from staff_test_session)
    );
    raise exception 'Une session révoquée a encore crédité une visite';
  exception when others then
    if sqlerrm <> 'STAFF_SESSION_INVALID' then raise; end if;
  end;
end $$;

reset role;
rollback;

select 'Caissiers : deux accès, PIN unique, audit et révocation immédiate OK' as resultat;
