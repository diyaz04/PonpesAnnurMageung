insert into storage.buckets (id, name, public)
values
  ('smp-spmb-bukti', 'smp-spmb-bukti', true),
  ('smp-spmb-foto', 'smp-spmb-foto', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "smp spmb bukti public upload" on storage.objects;
create policy "smp spmb bukti public upload" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'smp-spmb-bukti');

drop policy if exists "smp spmb bukti public read" on storage.objects;
create policy "smp spmb bukti public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'smp-spmb-bukti');

drop policy if exists "smp spmb bukti admin delete" on storage.objects;
create policy "smp spmb bukti admin delete" on storage.objects
for delete to authenticated
using (bucket_id = 'smp-spmb-bukti' and public.smp_has_role(array['superadmin', 'admin']));

drop policy if exists "smp spmb foto public upload" on storage.objects;
create policy "smp spmb foto public upload" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'smp-spmb-foto');

drop policy if exists "smp spmb foto public read" on storage.objects;
create policy "smp spmb foto public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'smp-spmb-foto');

drop policy if exists "smp spmb foto admin delete" on storage.objects;
create policy "smp spmb foto admin delete" on storage.objects
for delete to authenticated
using (bucket_id = 'smp-spmb-foto' and public.smp_has_role(array['superadmin', 'admin']));

drop policy if exists "spmb dokumen admin delete" on storage.objects;
create policy "spmb dokumen admin delete" on storage.objects
for delete to authenticated
using (bucket_id = 'spmb-dokumen' and public.smp_has_role(array['superadmin', 'admin']));

alter table public.smp_spmb_pendaftar
add column if not exists tahun_ajaran text,
add column if not exists nomor_pendaftaran text,
add column if not exists bukti_url text,
add column if not exists foto_url text,
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists smp_spmb_pendaftar_nomor_idx
on public.smp_spmb_pendaftar (nomor_pendaftaran)
where nomor_pendaftaran is not null;

create index if not exists smp_spmb_pendaftar_tahun_status_idx
on public.smp_spmb_pendaftar (tahun_ajaran, status);

drop trigger if exists set_smp_spmb_pendaftar_updated_at on public.smp_spmb_pendaftar;
create trigger set_smp_spmb_pendaftar_updated_at
before update on public.smp_spmb_pendaftar
for each row execute function public.set_updated_at();

insert into public.lp_konten (entitas, section, key, value)
values
  ('smp', 'spmb', 'active', 'false'),
  ('smp', 'spmb', 'tahun_ajaran', ''),
  ('smp', 'spmb', 'deskripsi', 'Lengkapi formulir SPMB. Bukti pendaftaran resmi akan otomatis dibuat setelah data terkirim.')
on conflict (entitas, section, key) do nothing;

create or replace function public.validate_smp_spmb(p_id uuid)
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
  from public.smp_spmb_pendaftar
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
      'asal_sekolah', registration.asal_sekolah,
      'dokumen_url', registration.dokumen_url,
      'foto_url', registration.foto_url,
      'status', registration.status,
      'bukti_url', registration.bukti_url,
      'created_at', registration.created_at,
      'updated_at', registration.updated_at
    )
  );
end;
$$;

grant execute on function public.validate_smp_spmb(uuid) to anon, authenticated;
