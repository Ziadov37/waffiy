-- La page QR est publique, mais ne doit exposer que le commerce actif demandé.
begin;

set local role anon;

do $$
declare
  preview record;
begin
  select * into preview from public.get_public_merchant('BURGER23');

  if preview.merchant_name is distinct from 'Burger House' then
    raise exception 'Le commerce public attendu est introuvable';
  end if;
  if preview.reward_name is null or preview.reward_threshold is null then
    raise exception 'La récompense principale active est absente';
  end if;
  if exists (select 1 from public.get_public_merchant('INVALID!')) then
    raise exception 'Un code invalide a retourné un commerce';
  end if;

  if exists (select join_code from public.merchants limit 1) then
    raise exception 'La lecture anonyme directe des commerces est autorisée';
  end if;
end $$;

reset role;

update public.merchants
set status = 'suspended'
where join_code = 'BURGER23';

set local role anon;

do $$
begin
  if exists (select 1 from public.get_public_merchant('BURGER23')) then
    raise exception 'Un commerce suspendu reste visible publiquement';
  end if;
end $$;

reset role;
rollback;

select 'Aperçu public : données minimales, codes invalides et suspension OK' as resultat;
