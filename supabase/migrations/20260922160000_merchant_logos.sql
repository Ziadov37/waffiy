-- Waffiy — logos publics des commerces, écriture réservée au propriétaire.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'merchant-logos',
  'merchant-logos',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists merchant_logos_public_read on storage.objects;
create policy merchant_logos_public_read on storage.objects
  for select to public
  using (bucket_id = 'merchant-logos');

drop policy if exists merchant_logos_owner_insert on storage.objects;
create policy merchant_logos_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'merchant-logos'
    and exists (
      select 1
      from public.merchants m
      where m.id::text = (storage.foldername(storage.objects.name))[1]
        and m.owner_id = auth.uid()
    )
  );

drop policy if exists merchant_logos_owner_update on storage.objects;
create policy merchant_logos_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'merchant-logos'
    and exists (
      select 1
      from public.merchants m
      where m.id::text = (storage.foldername(storage.objects.name))[1]
        and m.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'merchant-logos'
    and exists (
      select 1
      from public.merchants m
      where m.id::text = (storage.foldername(storage.objects.name))[1]
        and m.owner_id = auth.uid()
    )
  );

drop policy if exists merchant_logos_owner_delete on storage.objects;
create policy merchant_logos_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'merchant-logos'
    and exists (
      select 1
      from public.merchants m
      where m.id::text = (storage.foldername(storage.objects.name))[1]
        and m.owner_id = auth.uid()
    )
  );
