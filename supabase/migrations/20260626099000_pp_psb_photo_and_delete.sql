insert into storage.buckets (id, name, public)
values ('pp-psb-foto', 'pp-psb-foto', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "pp psb foto public upload" on storage.objects;
create policy "pp psb foto public upload" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'pp-psb-foto');

drop policy if exists "pp psb foto public read" on storage.objects;
create policy "pp psb foto public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'pp-psb-foto');

drop policy if exists "pp psb foto admin delete" on storage.objects;
create policy "pp psb foto admin delete" on storage.objects
for delete to authenticated
using (bucket_id = 'pp-psb-foto' and public.pp_has_role(array['superadmin', 'admin']));

drop policy if exists "pp psb bukti admin delete" on storage.objects;
create policy "pp psb bukti admin delete" on storage.objects
for delete to authenticated
using (bucket_id = 'pp-psb-bukti' and public.pp_has_role(array['superadmin', 'admin']));

alter table public.pp_psb_pendaftar
add column if not exists foto_url text;

create or replace function public.validate_pp_psb(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  registration record;
begin
  select *
  into registration
  from public.pp_psb_pendaftar
  where id = p_id;

  if registration.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object(
    'status', 'valid',
    'pendaftar', jsonb_build_object(
      'id', registration.id,
      'nomor_pendaftaran', registration.nomor_pendaftaran,
      'tahun_ajaran', registration.tahun_ajaran,
      'nama_lengkap', registration.nama_lengkap,
      'jenis_kelamin', registration.jenis_kelamin,
      'tanggal_lahir', registration.tanggal_lahir,
      'alamat', registration.alamat,
      'nama_orang_tua', registration.nama_orang_tua,
      'no_hp', registration.no_hp,
      'foto_url', registration.foto_url,
      'status', registration.status,
      'bukti_url', registration.bukti_url,
      'created_at', registration.created_at,
      'updated_at', registration.updated_at
    )
  );
end;
$$;

grant execute on function public.validate_pp_psb(uuid) to anon, authenticated;
