-- Initial Supabase schema for Pondok Pesantren An-Nur Mageung
-- and SMP Ma'arif NU Sariwangi.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Pesantren tables

create table public.pp_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('superadmin', 'admin', 'bendahara', 'guru')),
  nama text not null,
  created_at timestamptz not null default now()
);

create table public.pp_santri (
  id uuid primary key default gen_random_uuid(),
  nis text unique not null,
  kode_unik text unique not null,
  nama_lengkap text not null,
  jenis_kelamin text not null check (jenis_kelamin in ('L', 'P')),
  tahun_masuk int not null,
  tanggal_lahir date,
  alamat text,
  nama_wali text,
  no_hp_wali text,
  foto_url text,
  status text not null default 'aktif' check (status in ('aktif', 'alumni', 'keluar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pp_asatidz (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  nama_lengkap text not null,
  no_hp text,
  foto_url text,
  created_at timestamptz not null default now()
);

create table public.pp_guru_santri_assign (
  guru_id uuid not null references public.pp_asatidz(id) on delete cascade,
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guru_id, santri_id)
);

create table public.pp_raport_config (
  id uuid primary key default gen_random_uuid(),
  mata_pelajaran text not null,
  periode text not null,
  format_nilai text not null default 'angka' check (format_nilai in ('angka', 'huruf', 'predikat')),
  created_at timestamptz not null default now()
);

create table public.pp_raport_nilai (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  config_id uuid not null references public.pp_raport_config(id) on delete cascade,
  nilai text,
  guru_id uuid references public.pp_asatidz(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (santri_id, config_id)
);

create table public.pp_pelanggaran_jenis (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  bobot_poin int not null check (bobot_poin >= 0),
  tingkatan text check (tingkatan in ('ringan', 'sedang', 'berat'))
);

create table public.pp_pelanggaran (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  jenis_id uuid references public.pp_pelanggaran_jenis(id) on delete set null,
  tanggal date not null,
  pencatat_id uuid references auth.users(id) on delete set null,
  keterangan text,
  created_at timestamptz not null default now()
);

create table public.pp_capaian (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  jenis text not null,
  detail text not null,
  progres text,
  guru_id uuid references public.pp_asatidz(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.pp_psb_pendaftar (
  id uuid primary key default gen_random_uuid(),
  nama_lengkap text not null,
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  tanggal_lahir date,
  alamat text,
  nama_orang_tua text,
  no_hp text,
  dokumen_url text,
  status text not null default 'baru' check (status in ('baru', 'diverifikasi', 'diterima', 'ditolak')),
  created_at timestamptz not null default now()
);

create table public.pp_surat_keluar (
  id uuid primary key default gen_random_uuid(),
  nomor_surat text,
  jenis_surat text not null,
  perihal text,
  ditujukan text,
  tanggal_surat date not null,
  santri_id uuid references public.pp_santri(id) on delete set null,
  dibuat_oleh uuid references auth.users(id) on delete set null,
  file_url text,
  created_at timestamptz not null default now()
);

-- SMP tables

create table public.smp_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('superadmin', 'admin', 'bendahara', 'guru')),
  nama text not null,
  created_at timestamptz not null default now()
);

create table public.smp_siswa (
  id uuid primary key default gen_random_uuid(),
  nis text unique not null,
  nisn text unique,
  kode_unik text unique not null,
  nama_lengkap text not null,
  jenis_kelamin text not null check (jenis_kelamin in ('L', 'P')),
  kelas text,
  tahun_masuk int not null,
  tanggal_lahir date,
  alamat text,
  nama_wali text,
  no_hp_wali text,
  foto_url text,
  status text not null default 'aktif' check (status in ('aktif', 'alumni', 'keluar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.smp_guru (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  nama_lengkap text not null,
  no_hp text,
  mata_pelajaran text,
  foto_url text,
  created_at timestamptz not null default now()
);

create table public.smp_guru_siswa_assign (
  guru_id uuid not null references public.smp_guru(id) on delete cascade,
  siswa_id uuid not null references public.smp_siswa(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guru_id, siswa_id)
);

create table public.smp_raport_config (
  id uuid primary key default gen_random_uuid(),
  mata_pelajaran text not null,
  kelas text,
  semester text,
  periode text not null,
  format_nilai text not null default 'angka' check (format_nilai in ('angka', 'huruf', 'predikat')),
  created_at timestamptz not null default now()
);

create table public.smp_raport_nilai (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references public.smp_siswa(id) on delete cascade,
  config_id uuid not null references public.smp_raport_config(id) on delete cascade,
  nilai text,
  guru_id uuid references public.smp_guru(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (siswa_id, config_id)
);

create table public.smp_pelanggaran_jenis (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  bobot_poin int not null check (bobot_poin >= 0),
  tingkatan text check (tingkatan in ('ringan', 'sedang', 'berat'))
);

create table public.smp_pelanggaran (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references public.smp_siswa(id) on delete cascade,
  jenis_id uuid references public.smp_pelanggaran_jenis(id) on delete set null,
  tanggal date not null,
  pencatat_id uuid references auth.users(id) on delete set null,
  keterangan text,
  created_at timestamptz not null default now()
);

create table public.smp_presensi (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references public.smp_siswa(id) on delete cascade,
  tanggal date not null default current_date,
  jam_masuk timestamptz,
  jam_pulang timestamptz,
  status text not null default 'hadir' check (status in ('hadir', 'izin', 'sakit', 'alpa', 'terlambat')),
  metode text not null default 'manual' check (metode in ('manual', 'qr', 'face_recognition')),
  dicatat_oleh uuid references auth.users(id) on delete set null,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (siswa_id, tanggal)
);

create table public.smp_wajah_data (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references public.smp_siswa(id) on delete cascade,
  descriptor jsonb not null,
  foto_url text,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (siswa_id)
);

create table public.smp_spmb_pendaftar (
  id uuid primary key default gen_random_uuid(),
  nama_lengkap text not null,
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  tanggal_lahir date,
  alamat text,
  nama_orang_tua text,
  no_hp text,
  asal_sekolah text,
  dokumen_url text,
  status text not null default 'baru' check (status in ('baru', 'diverifikasi', 'diterima', 'ditolak')),
  created_at timestamptz not null default now()
);

create table public.smp_surat_keluar (
  id uuid primary key default gen_random_uuid(),
  nomor_surat text,
  jenis_surat text not null,
  perihal text,
  ditujukan text,
  tanggal_surat date not null,
  siswa_id uuid references public.smp_siswa(id) on delete set null,
  dibuat_oleh uuid references auth.users(id) on delete set null,
  file_url text,
  created_at timestamptz not null default now()
);

-- Centralized finance tables

create table public.keu_jenis_tagihan (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('pesantren', 'smp')),
  nama text not null,
  nominal numeric(14, 2) not null check (nominal >= 0),
  berlaku_untuk text not null default 'semua',
  created_at timestamptz not null default now()
);

create table public.keu_tagihan (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('pesantren', 'smp')),
  anggota_id uuid not null,
  jenis_tagihan_id uuid references public.keu_jenis_tagihan(id) on delete set null,
  nominal numeric(14, 2) not null check (nominal >= 0),
  status text not null default 'belum_lunas' check (status in ('belum_lunas', 'cicilan', 'lunas')),
  jatuh_tempo date,
  created_at timestamptz not null default now()
);

create table public.keu_pembayaran (
  id uuid primary key default gen_random_uuid(),
  tagihan_id uuid not null references public.keu_tagihan(id) on delete cascade,
  jumlah_bayar numeric(14, 2) not null check (jumlah_bayar > 0),
  tanggal_bayar date not null,
  bendahara_id uuid references auth.users(id) on delete set null,
  catatan text,
  kuitansi_url text,
  created_at timestamptz not null default now()
);

-- Landing page content tables

create table public.lp_konten (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('pesantren', 'smp')),
  section text not null,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  unique (entitas, section, key)
);

create table public.lp_berita (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('pesantren', 'smp')),
  judul text not null,
  thumbnail_url text,
  konten text,
  excerpt text,
  tanggal date,
  created_at timestamptz not null default now()
);

create table public.lp_agenda (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('pesantren', 'smp')),
  judul text not null,
  tanggal date not null,
  lokasi text,
  deskripsi text,
  created_at timestamptz not null default now()
);

create table public.lp_galeri (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('pesantren', 'smp')),
  album text,
  media_url text not null,
  tipe text not null default 'foto' check (tipe in ('foto', 'video')),
  created_at timestamptz not null default now()
);

create table public.lp_saran_kritik (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('pesantren', 'smp')),
  nama text,
  kontak text,
  pesan text not null,
  created_at timestamptz not null default now()
);

-- Updated-at triggers

create trigger set_pp_santri_updated_at
before update on public.pp_santri
for each row execute function public.set_updated_at();

create trigger set_pp_capaian_updated_at
before update on public.pp_capaian
for each row execute function public.set_updated_at();

create trigger set_smp_siswa_updated_at
before update on public.smp_siswa
for each row execute function public.set_updated_at();

create trigger set_smp_presensi_updated_at
before update on public.smp_presensi
for each row execute function public.set_updated_at();

create trigger set_smp_wajah_data_updated_at
before update on public.smp_wajah_data
for each row execute function public.set_updated_at();

create trigger set_lp_konten_updated_at
before update on public.lp_konten
for each row execute function public.set_updated_at();

-- Indexes

create index pp_profiles_role_idx on public.pp_profiles (role);
create index pp_santri_nis_idx on public.pp_santri (nis);
create index pp_santri_kode_unik_idx on public.pp_santri (kode_unik);
create index pp_santri_status_idx on public.pp_santri (status);
create index pp_asatidz_user_id_idx on public.pp_asatidz (user_id);
create index pp_guru_santri_assign_santri_id_idx on public.pp_guru_santri_assign (santri_id);
create index pp_raport_nilai_santri_id_idx on public.pp_raport_nilai (santri_id);
create index pp_pelanggaran_santri_id_idx on public.pp_pelanggaran (santri_id);
create index pp_capaian_santri_id_idx on public.pp_capaian (santri_id);

create index smp_profiles_role_idx on public.smp_profiles (role);
create index smp_siswa_nis_idx on public.smp_siswa (nis);
create index smp_siswa_kode_unik_idx on public.smp_siswa (kode_unik);
create index smp_siswa_kelas_idx on public.smp_siswa (kelas);
create index smp_siswa_status_idx on public.smp_siswa (status);
create index smp_guru_user_id_idx on public.smp_guru (user_id);
create index smp_guru_siswa_assign_siswa_id_idx on public.smp_guru_siswa_assign (siswa_id);
create index smp_raport_nilai_siswa_id_idx on public.smp_raport_nilai (siswa_id);
create index smp_pelanggaran_siswa_id_idx on public.smp_pelanggaran (siswa_id);
create index smp_presensi_siswa_tanggal_idx on public.smp_presensi (siswa_id, tanggal);
create index smp_wajah_data_siswa_id_idx on public.smp_wajah_data (siswa_id);

create index keu_jenis_tagihan_entitas_idx on public.keu_jenis_tagihan (entitas);
create index keu_tagihan_entitas_anggota_idx on public.keu_tagihan (entitas, anggota_id);
create index keu_tagihan_status_idx on public.keu_tagihan (status);
create index keu_pembayaran_tagihan_id_idx on public.keu_pembayaran (tagihan_id);

create index lp_konten_entitas_section_idx on public.lp_konten (entitas, section);
create index lp_berita_entitas_tanggal_idx on public.lp_berita (entitas, tanggal desc);
create index lp_agenda_entitas_tanggal_idx on public.lp_agenda (entitas, tanggal);
create index lp_galeri_entitas_album_idx on public.lp_galeri (entitas, album);

-- Role helpers are security definer functions to avoid recursive RLS lookups.

create or replace function public.pp_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.pp_profiles where id = auth.uid();
$$;

create or replace function public.smp_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.smp_profiles where id = auth.uid();
$$;

create or replace function public.pp_has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.pp_current_role() = any(roles), false);
$$;

create or replace function public.smp_has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.smp_current_role() = any(roles), false);
$$;

create or replace function public.is_bendahara()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.pp_current_role() in ('superadmin', 'bendahara'), false)
    or coalesce(public.smp_current_role() in ('superadmin', 'bendahara'), false);
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.pp_current_role() in ('superadmin', 'admin'), false)
    or coalesce(public.smp_current_role() in ('superadmin', 'admin'), false);
$$;

create or replace function public.pp_is_assigned_santri(santri_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pp_asatidz a
    join public.pp_guru_santri_assign gsa on gsa.guru_id = a.id
    where a.user_id = auth.uid()
      and gsa.santri_id = santri_uuid
  );
$$;

create or replace function public.smp_is_assigned_siswa(siswa_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.smp_guru g
    join public.smp_guru_siswa_assign gsa on gsa.guru_id = g.id
    where g.user_id = auth.uid()
      and gsa.siswa_id = siswa_uuid
  );
$$;

revoke execute on function public.pp_current_role() from public;
revoke execute on function public.smp_current_role() from public;
revoke execute on function public.pp_has_role(text[]) from public;
revoke execute on function public.smp_has_role(text[]) from public;
revoke execute on function public.is_bendahara() from public;
revoke execute on function public.is_platform_admin() from public;
revoke execute on function public.pp_is_assigned_santri(uuid) from public;
revoke execute on function public.smp_is_assigned_siswa(uuid) from public;

grant execute on function public.pp_current_role() to authenticated;
grant execute on function public.smp_current_role() to authenticated;
grant execute on function public.pp_has_role(text[]) to authenticated;
grant execute on function public.smp_has_role(text[]) to authenticated;
grant execute on function public.is_bendahara() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.pp_is_assigned_santri(uuid) to authenticated;
grant execute on function public.smp_is_assigned_siswa(uuid) to authenticated;

-- Public payment lookup via kode_unik. This avoids exposing all invoices to anon.

create or replace function public.get_public_payment_status(p_kode_unik text)
returns table (
  entitas text,
  anggota_nama text,
  tagihan_id uuid,
  jenis_tagihan text,
  nominal numeric,
  status text,
  jatuh_tempo date,
  total_dibayar numeric,
  sisa_tagihan numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with anggota as (
    select 'pesantren'::text as entitas, id as anggota_id, nama_lengkap
    from public.pp_santri
    where kode_unik = p_kode_unik
    union all
    select 'smp'::text as entitas, id as anggota_id, nama_lengkap
    from public.smp_siswa
    where kode_unik = p_kode_unik
  ),
  pembayaran as (
    select tagihan_id, coalesce(sum(jumlah_bayar), 0)::numeric as total_dibayar
    from public.keu_pembayaran
    group by tagihan_id
  )
  select
    t.entitas,
    a.nama_lengkap as anggota_nama,
    t.id as tagihan_id,
    jt.nama as jenis_tagihan,
    t.nominal,
    t.status,
    t.jatuh_tempo,
    coalesce(p.total_dibayar, 0)::numeric as total_dibayar,
    greatest(t.nominal - coalesce(p.total_dibayar, 0), 0)::numeric as sisa_tagihan
  from public.keu_tagihan t
  join anggota a on a.entitas = t.entitas and a.anggota_id = t.anggota_id
  left join public.keu_jenis_tagihan jt on jt.id = t.jenis_tagihan_id
  left join pembayaran p on p.tagihan_id = t.id
  order by t.created_at desc;
$$;

grant execute on function public.get_public_payment_status(text) to anon, authenticated;

-- Row Level Security

alter table public.pp_profiles enable row level security;
alter table public.pp_santri enable row level security;
alter table public.pp_asatidz enable row level security;
alter table public.pp_guru_santri_assign enable row level security;
alter table public.pp_raport_config enable row level security;
alter table public.pp_raport_nilai enable row level security;
alter table public.pp_pelanggaran_jenis enable row level security;
alter table public.pp_pelanggaran enable row level security;
alter table public.pp_capaian enable row level security;
alter table public.pp_psb_pendaftar enable row level security;
alter table public.pp_surat_keluar enable row level security;

alter table public.smp_profiles enable row level security;
alter table public.smp_siswa enable row level security;
alter table public.smp_guru enable row level security;
alter table public.smp_guru_siswa_assign enable row level security;
alter table public.smp_raport_config enable row level security;
alter table public.smp_raport_nilai enable row level security;
alter table public.smp_pelanggaran_jenis enable row level security;
alter table public.smp_pelanggaran enable row level security;
alter table public.smp_presensi enable row level security;
alter table public.smp_wajah_data enable row level security;
alter table public.smp_spmb_pendaftar enable row level security;
alter table public.smp_surat_keluar enable row level security;

alter table public.keu_jenis_tagihan enable row level security;
alter table public.keu_tagihan enable row level security;
alter table public.keu_pembayaran enable row level security;

alter table public.lp_konten enable row level security;
alter table public.lp_berita enable row level security;
alter table public.lp_agenda enable row level security;
alter table public.lp_galeri enable row level security;
alter table public.lp_saran_kritik enable row level security;

-- Pesantren RLS policies

create policy "pp_profiles self read" on public.pp_profiles
for select to authenticated
using (id = auth.uid() or public.pp_has_role(array['superadmin', 'admin']));

create policy "pp_profiles admin manage" on public.pp_profiles
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

create policy "pp_santri admin read" on public.pp_santri
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin']) or public.pp_is_assigned_santri(id));

create policy "pp_santri admin write" on public.pp_santri
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

create policy "pp_asatidz admin or self read" on public.pp_asatidz
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin']) or user_id = auth.uid());

create policy "pp_asatidz admin write" on public.pp_asatidz
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

create policy "pp_assign admin or assigned teacher read" on public.pp_guru_santri_assign
for select to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or exists (
    select 1 from public.pp_asatidz a
    where a.id = guru_id and a.user_id = auth.uid()
  )
);

create policy "pp_assign admin write" on public.pp_guru_santri_assign
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

create policy "pp_raport_config staff read" on public.pp_raport_config
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin', 'guru']));

create policy "pp_raport_config admin write" on public.pp_raport_config
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

create policy "pp_raport_nilai staff read" on public.pp_raport_nilai
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin']) or public.pp_is_assigned_santri(santri_id));

create policy "pp_raport_nilai staff write" on public.pp_raport_nilai
for all to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or (
    public.pp_current_role() = 'guru'
    and public.pp_is_assigned_santri(santri_id)
    and exists (
      select 1 from public.pp_asatidz a
      where a.id = guru_id and a.user_id = auth.uid()
    )
  )
)
with check (
  public.pp_has_role(array['superadmin', 'admin'])
  or (
    public.pp_current_role() = 'guru'
    and public.pp_is_assigned_santri(santri_id)
    and exists (
      select 1 from public.pp_asatidz a
      where a.id = guru_id and a.user_id = auth.uid()
    )
  )
);

create policy "pp_pelanggaran_jenis staff read" on public.pp_pelanggaran_jenis
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin', 'guru']));

create policy "pp_pelanggaran_jenis admin write" on public.pp_pelanggaran_jenis
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

create policy "pp_pelanggaran staff read" on public.pp_pelanggaran
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin']) or public.pp_is_assigned_santri(santri_id));

create policy "pp_pelanggaran staff write" on public.pp_pelanggaran
for all to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or (public.pp_current_role() = 'guru' and public.pp_is_assigned_santri(santri_id))
)
with check (
  public.pp_has_role(array['superadmin', 'admin'])
  or (public.pp_current_role() = 'guru' and public.pp_is_assigned_santri(santri_id) and pencatat_id = auth.uid())
);

create policy "pp_capaian staff read" on public.pp_capaian
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin']) or public.pp_is_assigned_santri(santri_id));

create policy "pp_capaian staff write" on public.pp_capaian
for all to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or (
    public.pp_current_role() = 'guru'
    and public.pp_is_assigned_santri(santri_id)
    and exists (
      select 1 from public.pp_asatidz a
      where a.id = guru_id and a.user_id = auth.uid()
    )
  )
)
with check (
  public.pp_has_role(array['superadmin', 'admin'])
  or (
    public.pp_current_role() = 'guru'
    and public.pp_is_assigned_santri(santri_id)
    and exists (
      select 1 from public.pp_asatidz a
      where a.id = guru_id and a.user_id = auth.uid()
    )
  )
);

create policy "pp_psb public insert" on public.pp_psb_pendaftar
for insert to anon, authenticated
with check (true);

create policy "pp_psb admin manage" on public.pp_psb_pendaftar
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

create policy "pp_surat_keluar admin read" on public.pp_surat_keluar
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin']));

create policy "pp_surat_keluar admin write" on public.pp_surat_keluar
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

-- SMP RLS policies

create policy "smp_profiles self read" on public.smp_profiles
for select to authenticated
using (id = auth.uid() or public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_profiles admin manage" on public.smp_profiles
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_siswa admin read" on public.smp_siswa
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']) or public.smp_is_assigned_siswa(id));

create policy "smp_siswa admin write" on public.smp_siswa
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_guru admin or self read" on public.smp_guru
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']) or user_id = auth.uid());

create policy "smp_guru admin write" on public.smp_guru
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_assign admin or assigned teacher read" on public.smp_guru_siswa_assign
for select to authenticated
using (
  public.smp_has_role(array['superadmin', 'admin'])
  or exists (
    select 1 from public.smp_guru g
    where g.id = guru_id and g.user_id = auth.uid()
  )
);

create policy "smp_assign admin write" on public.smp_guru_siswa_assign
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_raport_config staff read" on public.smp_raport_config
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin', 'guru']));

create policy "smp_raport_config admin write" on public.smp_raport_config
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_raport_nilai staff read" on public.smp_raport_nilai
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']) or public.smp_is_assigned_siswa(siswa_id));

create policy "smp_raport_nilai staff write" on public.smp_raport_nilai
for all to authenticated
using (
  public.smp_has_role(array['superadmin', 'admin'])
  or (
    public.smp_current_role() = 'guru'
    and public.smp_is_assigned_siswa(siswa_id)
    and exists (
      select 1 from public.smp_guru g
      where g.id = guru_id and g.user_id = auth.uid()
    )
  )
)
with check (
  public.smp_has_role(array['superadmin', 'admin'])
  or (
    public.smp_current_role() = 'guru'
    and public.smp_is_assigned_siswa(siswa_id)
    and exists (
      select 1 from public.smp_guru g
      where g.id = guru_id and g.user_id = auth.uid()
    )
  )
);

create policy "smp_pelanggaran_jenis staff read" on public.smp_pelanggaran_jenis
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin', 'guru']));

create policy "smp_pelanggaran_jenis admin write" on public.smp_pelanggaran_jenis
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_pelanggaran staff read" on public.smp_pelanggaran
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']) or public.smp_is_assigned_siswa(siswa_id));

create policy "smp_pelanggaran staff write" on public.smp_pelanggaran
for all to authenticated
using (
  public.smp_has_role(array['superadmin', 'admin'])
  or (public.smp_current_role() = 'guru' and public.smp_is_assigned_siswa(siswa_id))
)
with check (
  public.smp_has_role(array['superadmin', 'admin'])
  or (public.smp_current_role() = 'guru' and public.smp_is_assigned_siswa(siswa_id) and pencatat_id = auth.uid())
);

create policy "smp_presensi staff read" on public.smp_presensi
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']) or public.smp_is_assigned_siswa(siswa_id));

create policy "smp_presensi staff write" on public.smp_presensi
for all to authenticated
using (
  public.smp_has_role(array['superadmin', 'admin'])
  or (public.smp_current_role() = 'guru' and public.smp_is_assigned_siswa(siswa_id))
)
with check (
  public.smp_has_role(array['superadmin', 'admin'])
  or (public.smp_current_role() = 'guru' and public.smp_is_assigned_siswa(siswa_id))
);

create policy "smp_wajah_data admin read" on public.smp_wajah_data
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_wajah_data admin write" on public.smp_wajah_data
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_spmb public insert" on public.smp_spmb_pendaftar
for insert to anon, authenticated
with check (true);

create policy "smp_spmb admin manage" on public.smp_spmb_pendaftar
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_surat_keluar admin read" on public.smp_surat_keluar
for select to authenticated
using (public.smp_has_role(array['superadmin', 'admin']));

create policy "smp_surat_keluar admin write" on public.smp_surat_keluar
for all to authenticated
using (public.smp_has_role(array['superadmin', 'admin']))
with check (public.smp_has_role(array['superadmin', 'admin']));

-- Finance RLS policies

create policy "keu_jenis_tagihan bendahara read" on public.keu_jenis_tagihan
for select to authenticated
using (public.is_bendahara());

create policy "keu_jenis_tagihan bendahara write" on public.keu_jenis_tagihan
for all to authenticated
using (public.is_bendahara())
with check (public.is_bendahara());

create policy "keu_tagihan bendahara read" on public.keu_tagihan
for select to authenticated
using (public.is_bendahara());

create policy "keu_tagihan bendahara write" on public.keu_tagihan
for all to authenticated
using (public.is_bendahara())
with check (public.is_bendahara());

create policy "keu_pembayaran bendahara read" on public.keu_pembayaran
for select to authenticated
using (public.is_bendahara());

create policy "keu_pembayaran bendahara write" on public.keu_pembayaran
for all to authenticated
using (public.is_bendahara())
with check (public.is_bendahara());

-- Landing page RLS policies

create policy "lp_konten public read" on public.lp_konten
for select to anon, authenticated
using (true);

create policy "lp_konten admin write" on public.lp_konten
for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "lp_berita public read" on public.lp_berita
for select to anon, authenticated
using (true);

create policy "lp_berita admin write" on public.lp_berita
for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "lp_agenda public read" on public.lp_agenda
for select to anon, authenticated
using (true);

create policy "lp_agenda admin write" on public.lp_agenda
for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "lp_galeri public read" on public.lp_galeri
for select to anon, authenticated
using (true);

create policy "lp_galeri admin write" on public.lp_galeri
for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "lp_saran_kritik public insert" on public.lp_saran_kritik
for insert to anon, authenticated
with check (true);

create policy "lp_saran_kritik admin read" on public.lp_saran_kritik
for select to authenticated
using (public.is_platform_admin());

create policy "lp_saran_kritik admin update delete" on public.lp_saran_kritik
for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());
