-- Support objects for pesantren data modules.

insert into storage.buckets (id, name, public)
values ('santri-foto', 'santri-foto', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('surat-keluar', 'surat-keluar', false)
on conflict (id) do nothing;

drop policy if exists "santri foto staff upload" on storage.objects;
create policy "santri foto staff upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'santri-foto' and public.pp_has_role(array['superadmin', 'admin']));

drop policy if exists "santri foto public read" on storage.objects;
create policy "santri foto public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'santri-foto');

drop policy if exists "surat keluar admin upload" on storage.objects;
create policy "surat keluar admin upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'surat-keluar' and public.pp_has_role(array['superadmin', 'admin']));

drop policy if exists "surat keluar admin read" on storage.objects;
create policy "surat keluar admin read" on storage.objects
for select to authenticated
using (bucket_id = 'surat-keluar' and public.pp_has_role(array['superadmin', 'admin']));

create table if not exists public.pp_kode_unik_audit (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  kode_lama text,
  kode_baru text not null,
  pelaku_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.pp_kode_unik_audit enable row level security;

drop policy if exists "pp kode audit admin read" on public.pp_kode_unik_audit;
create policy "pp kode audit admin read" on public.pp_kode_unik_audit
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin']));

drop policy if exists "pp kode audit admin insert" on public.pp_kode_unik_audit;
create policy "pp kode audit admin insert" on public.pp_kode_unik_audit
for insert to authenticated
with check (public.pp_has_role(array['superadmin', 'admin']));

create table if not exists public.pp_pelanggaran_tingkatan (
  id uuid primary key default gen_random_uuid(),
  tingkatan text not null unique check (tingkatan in ('ringan', 'sedang', 'berat')),
  tindakan text,
  updated_at timestamptz not null default now()
);

alter table public.pp_pelanggaran_tingkatan enable row level security;

drop trigger if exists set_pp_pelanggaran_tingkatan_updated_at on public.pp_pelanggaran_tingkatan;
create trigger set_pp_pelanggaran_tingkatan_updated_at
before update on public.pp_pelanggaran_tingkatan
for each row execute function public.set_updated_at();

drop policy if exists "pp tingkatan staff read" on public.pp_pelanggaran_tingkatan;
create policy "pp tingkatan staff read" on public.pp_pelanggaran_tingkatan
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin', 'guru']));

drop policy if exists "pp tingkatan admin write" on public.pp_pelanggaran_tingkatan;
create policy "pp tingkatan admin write" on public.pp_pelanggaran_tingkatan
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

insert into public.pp_pelanggaran_tingkatan (tingkatan, tindakan)
values
  ('ringan', 'Pembinaan dan teguran lisan.'),
  ('sedang', 'Pembinaan tertulis dan pemanggilan wali bila diperlukan.'),
  ('berat', 'Sidang pembinaan dan tindak lanjut pimpinan pesantren.')
on conflict (tingkatan) do nothing;

create table if not exists public.pp_capaian_riwayat (
  id uuid primary key default gen_random_uuid(),
  capaian_id uuid references public.pp_capaian(id) on delete cascade,
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  jenis text not null,
  detail text not null,
  progres text,
  guru_id uuid references public.pp_asatidz(id) on delete set null,
  aksi text not null check (aksi in ('insert', 'update')),
  created_at timestamptz not null default now()
);

alter table public.pp_capaian_riwayat enable row level security;

create or replace function public.log_pp_capaian_riwayat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pp_capaian_riwayat (
    capaian_id,
    santri_id,
    jenis,
    detail,
    progres,
    guru_id,
    aksi
  )
  values (
    new.id,
    new.santri_id,
    new.jenis,
    new.detail,
    new.progres,
    new.guru_id,
    lower(tg_op)
  );

  return new;
end;
$$;

drop trigger if exists log_pp_capaian_riwayat_trigger on public.pp_capaian;
create trigger log_pp_capaian_riwayat_trigger
after insert or update on public.pp_capaian
for each row execute function public.log_pp_capaian_riwayat();

drop policy if exists "pp capaian riwayat staff read" on public.pp_capaian_riwayat;
create policy "pp capaian riwayat staff read" on public.pp_capaian_riwayat
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin']) or public.pp_is_assigned_santri(santri_id));
