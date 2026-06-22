-- Support objects for SMP admin modules.

insert into storage.buckets (id, name, public)
values ('siswa-foto', 'siswa-foto', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('smp-surat-keluar', 'smp-surat-keluar', false)
on conflict (id) do nothing;

drop policy if exists "siswa foto staff upload" on storage.objects;
create policy "siswa foto staff upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'siswa-foto' and public.smp_has_role(array['superadmin', 'admin']));

drop policy if exists "siswa foto public read" on storage.objects;
create policy "siswa foto public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'siswa-foto');

drop policy if exists "smp surat keluar admin upload" on storage.objects;
create policy "smp surat keluar admin upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'smp-surat-keluar' and public.smp_has_role(array['superadmin', 'admin']));

drop policy if exists "smp surat keluar admin read" on storage.objects;
create policy "smp surat keluar admin read" on storage.objects
for select to authenticated
using (bucket_id = 'smp-surat-keluar' and public.smp_has_role(array['superadmin', 'admin']));

create table if not exists public.smp_kode_unik_audit (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references public.smp_siswa(id) on delete cascade,
  kode_lama text,
  kode_baru text not null,
  pelaku_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.smp_kode_unik_audit enable row level security;

drop policy if exists "smp kode audit admin read" on public.smp_kode_unik_audit;
create policy "smp kode audit admin read" on public.smp_kode_unik_audit
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']));

drop policy if exists "smp kode audit admin insert" on public.smp_kode_unik_audit;
create policy "smp kode audit admin insert" on public.smp_kode_unik_audit
for insert to authenticated
with check (public.smp_has_role(array['superadmin', 'admin']));

create table if not exists public.smp_pelanggaran_tingkatan (
  id uuid primary key default gen_random_uuid(),
  tingkatan text not null unique check (tingkatan in ('ringan', 'sedang', 'berat')),
  tindakan text,
  updated_at timestamptz not null default now()
);

alter table public.smp_pelanggaran_tingkatan enable row level security;

drop trigger if exists set_smp_pelanggaran_tingkatan_updated_at on public.smp_pelanggaran_tingkatan;
create trigger set_smp_pelanggaran_tingkatan_updated_at
before update on public.smp_pelanggaran_tingkatan
for each row execute function public.set_updated_at();

drop policy if exists "smp tingkatan staff read" on public.smp_pelanggaran_tingkatan;
create policy "smp tingkatan staff read" on public.smp_pelanggaran_tingkatan
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin', 'guru']));

drop policy if exists "smp tingkatan admin write" on public.smp_pelanggaran_tingkatan;
create policy "smp tingkatan admin write" on public.smp_pelanggaran_tingkatan
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

insert into public.smp_pelanggaran_tingkatan (tingkatan, tindakan)
values
  ('ringan', 'Pembinaan dan teguran lisan.'),
  ('sedang', 'Pembinaan tertulis dan komunikasi wali bila diperlukan.'),
  ('berat', 'Sidang pembinaan dan tindak lanjut kepala sekolah.')
on conflict (tingkatan) do nothing;

create table if not exists public.smp_capaian (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references public.smp_siswa(id) on delete cascade,
  jenis text not null,
  detail text not null,
  progres text,
  guru_id uuid references public.smp_guru(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.smp_capaian enable row level security;

drop trigger if exists set_smp_capaian_updated_at on public.smp_capaian;
create trigger set_smp_capaian_updated_at
before update on public.smp_capaian
for each row execute function public.set_updated_at();

drop policy if exists "smp capaian staff read" on public.smp_capaian;
create policy "smp capaian staff read" on public.smp_capaian
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']) or public.smp_is_assigned_siswa(siswa_id));

drop policy if exists "smp capaian staff write" on public.smp_capaian;
create policy "smp capaian staff write" on public.smp_capaian
for all to authenticated
using (
  public.smp_has_role(array['superadmin', 'admin'])
  or (
    public.smp_current_role() = 'guru'
    and public.smp_is_assigned_siswa(siswa_id)
  )
)
with check (
  public.smp_has_role(array['superadmin', 'admin'])
  or (
    public.smp_current_role() = 'guru'
    and public.smp_is_assigned_siswa(siswa_id)
  )
);

create table if not exists public.smp_capaian_riwayat (
  id uuid primary key default gen_random_uuid(),
  capaian_id uuid references public.smp_capaian(id) on delete cascade,
  siswa_id uuid not null references public.smp_siswa(id) on delete cascade,
  jenis text not null,
  detail text not null,
  progres text,
  guru_id uuid references public.smp_guru(id) on delete set null,
  aksi text not null check (aksi in ('insert', 'update')),
  created_at timestamptz not null default now()
);

alter table public.smp_capaian_riwayat enable row level security;

create or replace function public.log_smp_capaian_riwayat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.smp_capaian_riwayat (
    capaian_id,
    siswa_id,
    jenis,
    detail,
    progres,
    guru_id,
    aksi
  )
  values (
    new.id,
    new.siswa_id,
    new.jenis,
    new.detail,
    new.progres,
    new.guru_id,
    lower(tg_op)
  );

  return new;
end;
$$;

drop trigger if exists log_smp_capaian_riwayat_trigger on public.smp_capaian;
create trigger log_smp_capaian_riwayat_trigger
after insert or update on public.smp_capaian
for each row execute function public.log_smp_capaian_riwayat();

drop policy if exists "smp capaian riwayat staff read" on public.smp_capaian_riwayat;
create policy "smp capaian riwayat staff read" on public.smp_capaian_riwayat
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']) or public.smp_is_assigned_siswa(siswa_id));

drop policy if exists "smp_wajah_data staff read" on public.smp_wajah_data;
create policy "smp_wajah_data staff read" on public.smp_wajah_data
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']) or public.smp_current_role() = 'guru');

drop policy if exists "smp_wajah_data staff write" on public.smp_wajah_data;
create policy "smp_wajah_data staff write" on public.smp_wajah_data
for all to authenticated
using (
  public.smp_has_role(array['superadmin', 'admin'])
  or (public.smp_current_role() = 'guru' and public.smp_is_assigned_siswa(siswa_id))
)
with check (
  public.smp_has_role(array['superadmin', 'admin'])
  or (public.smp_current_role() = 'guru' and public.smp_is_assigned_siswa(siswa_id))
);
