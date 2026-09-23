begin;

do $$
begin
  if public.normalize_dz_phone('0555 12 34 56') <> '+213555123456'
     or public.normalize_dz_phone('06 55 12 34 56') <> '+213655123456'
     or public.normalize_dz_phone('+213 7 55 12 34 56') <> '+213755123456'
     or public.normalize_dz_phone('00213 5 55 12 34 56') <> '+213555123456'
     or public.normalize_dz_phone('213655123456') <> '+213655123456'
     or public.normalize_dz_phone('555123456') <> '+213555123456'
     or public.normalize_dz_phone('+213 21 00 00 01') <> '+21321000001' then
    raise exception 'La normalisation DZ ne couvre pas tous les formats attendus';
  end if;

  if public.normalize_dz_phone('041234567') is not null
     or public.normalize_dz_phone('+33123456789') is not null then
    raise exception 'Un numéro non mobile algérien a été accepté';
  end if;

  if public.normalize_stored_phone('+33 7 58 44 27 90') <> '+33758442790' then
    raise exception 'Un téléphone E.164 historique valide n’a pas été préservé';
  end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '22222222-2222-4222-8222-666666666666',
  'phone.test@example.dz',
  '{"first_name":"Test","last_name":"Téléphone","phone":"0555 12 34 56"}'::jsonb
);

do $$
begin
  if (select phone from public.profiles where id = '22222222-2222-4222-8222-666666666666')
     <> '+213555123456' then
    raise exception 'Le téléphone du profil n’a pas été canonisé';
  end if;

  if public.lookup_login_email('+213555123456') is not null then
    raise exception 'Un téléphone non vérifié permet la connexion';
  end if;
end $$;

update auth.users
set phone = '+213555123456', phone_confirmed_at = now()
where id = '22222222-2222-4222-8222-666666666666';

do $$
begin
  if public.lookup_login_email('0555 12 34 56') <> 'phone.test@example.dz' then
    raise exception 'Le format local ne résout pas le compte vérifié';
  end if;
  if public.lookup_login_email('+213 5 55 12 34 56') <> 'phone.test@example.dz' then
    raise exception 'Le format international ne résout pas le même compte';
  end if;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-666666666666","role":"authenticated"}',
  true
);
set local role authenticated;

update public.profiles
set phone = '0655 12 34 56', phone_verified_at = now()
where id = '22222222-2222-4222-8222-666666666666';

reset role;

do $$
begin
  if (select phone from public.profiles where id = '22222222-2222-4222-8222-666666666666')
     <> '+213655123456' then
    raise exception 'La mise à jour utilisateur n’a pas été canonisée';
  end if;
  if (select phone_verified_at from public.profiles where id = '22222222-2222-4222-8222-666666666666')
     is not null then
    raise exception 'Un utilisateur a pu auto-vérifier son téléphone';
  end if;
end $$;

rollback;

select 'Téléphones DZ : formats, unicité logique et preuve OTP OK' as resultat;
