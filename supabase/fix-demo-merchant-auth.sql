begin;

update auth.users
set instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
    aud = 'authenticated',
    role = 'authenticated',
    encrypted_password = extensions.crypt(
      'WaffiyDemo2026!',
      extensions.gen_salt('bf')
    ),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    phone_change = '',
    phone_change_token = '',
    reauthentication_token = '',
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    is_sso_user = false,
    is_anonymous = false,
    created_at = coalesce(created_at, now()),
    updated_at = now()
where email = 'karim@burgerhouse.dz';

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at
)
select
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
from auth.users u
where u.email = 'karim@burgerhouse.dz'
  and not exists (
    select 1
    from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

commit;

select
  u.email,
  u.email_confirmed_at is not null as confirmed,
  u.encrypted_password is not null and u.encrypted_password <> '' as has_password,
  exists (
    select 1
    from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  ) as has_email_identity
from auth.users u
where u.email = 'karim@burgerhouse.dz';
