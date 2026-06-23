-- Per-person payment settings and activity savings ledger.

alter table public.keu_tagihan
  add column if not exists nama_tagihan text,
  add column if not exists catatan text,
  add column if not exists kategori text not null default 'insidentil'
    check (kategori in ('bulanan', 'masuk_cicil', 'insidentil', 'tabungan')),
  add column if not exists bisa_dicicil boolean not null default true,
  add column if not exists periode text,
  add column if not exists sumber_pengaturan_id uuid,
  add column if not exists tabungan_target numeric(14, 2) not null default 0 check (tabungan_target >= 0),
  add column if not exists ditarik_at timestamptz,
  add column if not exists ditarik_oleh uuid references auth.users(id) on delete set null,
  add column if not exists catatan_penarikan text;

create table if not exists public.keu_pengaturan_pembayaran (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('pesantren', 'smp')),
  anggota_id uuid not null,
  profil_pembayaran text not null default 'santri_siswa'
    check (profil_pembayaran in ('santri_siswa', 'santri_non_siswa', 'siswa_saja', 'khusus')),
  total_bulanan numeric(14, 2) not null default 0 check (total_bulanan >= 0),
  tabungan_bulanan numeric(14, 2) not null default 0 check (tabungan_bulanan >= 0),
  aktif boolean not null default true,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entitas, anggota_id)
);

create table if not exists public.keu_pengaturan_item (
  id uuid primary key default gen_random_uuid(),
  pengaturan_id uuid not null references public.keu_pengaturan_pembayaran(id) on delete cascade,
  nama text not null,
  nominal numeric(14, 2) not null default 0 check (nominal >= 0),
  kategori text not null check (kategori in ('bulanan', 'masuk_cicil', 'insidentil', 'tabungan')),
  bisa_dicicil boolean not null default true,
  masuk_tabungan boolean not null default false,
  aktif boolean not null default true,
  urutan int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.keu_tabungan_kegiatan (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('pesantren', 'smp')),
  anggota_id uuid not null,
  tagihan_id uuid references public.keu_tagihan(id) on delete set null,
  pembayaran_id uuid references public.keu_pembayaran(id) on delete set null,
  tipe text not null check (tipe in ('setoran_otomatis', 'pemakaian_insidentil', 'penyesuaian')),
  nominal numeric(14, 2) not null check (nominal <> 0),
  tanggal date not null default current_date,
  catatan text,
  dibuat_oleh uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'keu_tagihan_sumber_pengaturan_id_fkey'
  ) then
    alter table public.keu_tagihan
      add constraint keu_tagihan_sumber_pengaturan_id_fkey
      foreign key (sumber_pengaturan_id)
      references public.keu_pengaturan_pembayaran(id)
      on delete set null;
  end if;
end $$;

drop trigger if exists set_keu_pengaturan_pembayaran_updated_at on public.keu_pengaturan_pembayaran;
create trigger set_keu_pengaturan_pembayaran_updated_at
before update on public.keu_pengaturan_pembayaran
for each row execute function public.set_updated_at();

create index if not exists keu_pengaturan_entitas_anggota_idx
  on public.keu_pengaturan_pembayaran (entitas, anggota_id);

create index if not exists keu_pengaturan_item_pengaturan_idx
  on public.keu_pengaturan_item (pengaturan_id);

create index if not exists keu_tabungan_entitas_anggota_idx
  on public.keu_tabungan_kegiatan (entitas, anggota_id);

create index if not exists keu_tagihan_periode_idx
  on public.keu_tagihan (entitas, periode);

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'keu_tagihan_no_duplicate_active_idx'
  )
  and not exists (
    select 1
    from (
      select
        entitas,
        anggota_id,
        kategori,
        coalesce(nama_tagihan, '') as nama_tagihan,
        coalesce(periode, '') as periode,
        count(*) as total
      from public.keu_tagihan
      where ditarik_at is null
      group by entitas, anggota_id, kategori, coalesce(nama_tagihan, ''), coalesce(periode, '')
      having count(*) > 1
    ) duplicates
  ) then
    create unique index keu_tagihan_no_duplicate_active_idx
      on public.keu_tagihan (
        entitas,
        anggota_id,
        kategori,
        coalesce(nama_tagihan, ''),
        coalesce(periode, '')
      )
      where ditarik_at is null;
  end if;
end $$;

alter table public.keu_pengaturan_pembayaran enable row level security;
alter table public.keu_pengaturan_item enable row level security;
alter table public.keu_tabungan_kegiatan enable row level security;

drop policy if exists "pp_santri bendahara read" on public.pp_santri;
create policy "pp_santri bendahara read" on public.pp_santri
for select to authenticated
using (public.is_bendahara());

drop policy if exists "smp_siswa bendahara read" on public.smp_siswa;
create policy "smp_siswa bendahara read" on public.smp_siswa
for select to authenticated
using (public.is_bendahara());

drop policy if exists "keu_pengaturan_pembayaran bendahara read" on public.keu_pengaturan_pembayaran;
create policy "keu_pengaturan_pembayaran bendahara read" on public.keu_pengaturan_pembayaran
for select to authenticated
using (public.is_bendahara());

drop policy if exists "keu_pengaturan_pembayaran bendahara write" on public.keu_pengaturan_pembayaran;
create policy "keu_pengaturan_pembayaran bendahara write" on public.keu_pengaturan_pembayaran
for all to authenticated
using (public.is_bendahara())
with check (public.is_bendahara());

drop policy if exists "keu_pengaturan_item bendahara read" on public.keu_pengaturan_item;
create policy "keu_pengaturan_item bendahara read" on public.keu_pengaturan_item
for select to authenticated
using (public.is_bendahara());

drop policy if exists "keu_pengaturan_item bendahara write" on public.keu_pengaturan_item;
create policy "keu_pengaturan_item bendahara write" on public.keu_pengaturan_item
for all to authenticated
using (public.is_bendahara())
with check (public.is_bendahara());

drop policy if exists "keu_tabungan_kegiatan bendahara read" on public.keu_tabungan_kegiatan;
create policy "keu_tabungan_kegiatan bendahara read" on public.keu_tabungan_kegiatan
for select to authenticated
using (public.is_bendahara());

drop policy if exists "keu_tabungan_kegiatan bendahara write" on public.keu_tabungan_kegiatan;
create policy "keu_tabungan_kegiatan bendahara write" on public.keu_tabungan_kegiatan
for all to authenticated
using (public.is_bendahara())
with check (public.is_bendahara());

create or replace function public.tarik_keu_tagihan(
  p_tagihan_id uuid,
  p_catatan text default 'Ditarik oleh bendahara karena koreksi tagihan.'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_bendahara() then
    raise exception 'Hanya superadmin dan bendahara yang bisa menarik tagihan.';
  end if;

  update public.keu_tagihan
  set ditarik_at = now(),
      ditarik_oleh = auth.uid(),
      catatan_penarikan = p_catatan
  where id = p_tagihan_id;

  if not found then
    raise exception 'Tagihan tidak ditemukan.';
  end if;
end;
$$;

grant execute on function public.tarik_keu_tagihan(uuid, text) to authenticated;

create or replace function public.get_pesantren_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_role text := public.pp_current_role();
  active_count int := 0;
  alumni_count int := 0;
  unpaid_count int := null;
  unpaid_nominal numeric := null;
  violation_count int := 0;
begin
  if current_role is null
    or current_role not in ('superadmin', 'admin', 'bendahara', 'guru') then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select count(*) into active_count
  from public.pp_santri
  where status = 'aktif';

  select count(*) into alumni_count
  from public.pp_santri
  where status = 'alumni';

  select count(*) into violation_count
  from public.pp_pelanggaran
  where tanggal >= date_trunc('month', current_date)::date
    and tanggal < (date_trunc('month', current_date) + interval '1 month')::date;

  if current_role in ('superadmin', 'bendahara') then
    select count(*), coalesce(sum(nominal), 0)
    into unpaid_count, unpaid_nominal
    from public.keu_tagihan
    where entitas = 'pesantren'
      and status <> 'lunas'
      and ditarik_at is null;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'total_santri_aktif', active_count,
    'total_alumni', alumni_count,
    'tagihan_belum_lunas', unpaid_count,
    'nominal_belum_lunas', unpaid_nominal,
    'pelanggaran_bulan_ini', violation_count
  );
end;
$$;

grant execute on function public.get_pesantren_dashboard_stats() to authenticated;
