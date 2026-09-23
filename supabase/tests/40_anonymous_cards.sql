-- Une session invitée peut obtenir une carte, mais jamais créer un commerce.
begin;

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-555555555555","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select public.join_merchant('BURGER23');

do $$
begin
  if not exists (
    select 1 from public.memberships
    where profile_id = '22222222-2222-4222-8222-555555555555'
      and merchant_id = '33333333-3333-4333-8333-111111111111'
  ) then
    raise exception 'La session invitée n’a pas obtenu sa carte';
  end if;

  begin
    insert into public.merchants (owner_id, name, category, city, join_code)
    values (
      '22222222-2222-4222-8222-555555555555',
      'Commerce invité interdit',
      'other',
      'Alger',
      'GUEST234'
    );
    raise exception 'Une session invitée a créé un commerce';
  exception when others then
    if sqlerrm <> 'PERMANENT_ACCOUNT_REQUIRED' then raise; end if;
  end;
end $$;

reset role;
rollback;

select 'Session invitée : carte autorisée et création de commerce refusée OK' as resultat;
