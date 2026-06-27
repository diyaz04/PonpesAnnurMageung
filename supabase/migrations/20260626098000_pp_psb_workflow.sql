insert into storage.buckets (id, name, public)
values ('pp-psb-bukti', 'pp-psb-bukti', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "pp psb bukti public upload" on storage.objects;
create policy "pp psb bukti public upload" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'pp-psb-bukti');

drop policy if exists "pp psb bukti public read" on storage.objects;
create policy "pp psb bukti public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'pp-psb-bukti');

alter table public.pp_psb_pendaftar
add column if not exists tahun_ajaran text,
add column if not exists nomor_pendaftaran text,
add column if not exists bukti_url text,
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists pp_psb_pendaftar_nomor_idx
on public.pp_psb_pendaftar (nomor_pendaftaran)
where nomor_pendaftaran is not null;

create index if not exists pp_psb_pendaftar_tahun_status_idx
on public.pp_psb_pendaftar (tahun_ajaran, status);

drop trigger if exists set_pp_psb_pendaftar_updated_at on public.pp_psb_pendaftar;
create trigger set_pp_psb_pendaftar_updated_at
before update on public.pp_psb_pendaftar
for each row execute function public.set_updated_at();

insert into public.lp_konten (entitas, section, key, value)
values
  ('pesantren', 'psb', 'active', 'false'),
  ('pesantren', 'psb', 'tahun_ajaran', ''),
  ('pesantren', 'psb', 'deskripsi', 'Lengkapi formulir pendaftaran santri baru. Bukti pendaftaran resmi akan otomatis dibuat setelah data terkirim.')
on conflict (entitas, section, key) do update set value = excluded.value;

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
      'status', registration.status,
      'bukti_url', registration.bukti_url,
      'created_at', registration.created_at,
      'updated_at', registration.updated_at
    )
  );
end;
$$;

grant execute on function public.validate_pp_psb(uuid) to anon, authenticated;
