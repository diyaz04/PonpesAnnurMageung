-- Extended biodata fields for pesantren santri and PSB registration.

alter table public.pp_santri
  add column if not exists tanggal_masuk date,
  add column if not exists kewarganegaraan text,
  add column if not exists nik text,
  add column if not exists nisn text,
  add column if not exists tempat_lahir text,
  add column if not exists agama text,
  add column if not exists no_handphone text,
  add column if not exists nama_ayah_kandung text,
  add column if not exists status_ayah_kandung text,
  add column if not exists nik_ayah text,
  add column if not exists nama_ibu_kandung text,
  add column if not exists status_ibu_kandung text,
  add column if not exists nik_ibu text,
  add column if not exists status_wali text,
  add column if not exists jenjang text,
  add column if not exists tingkat_kelas text,
  add column if not exists kitas text,
  add column if not exists asal_negara text;

alter table public.pp_psb_pendaftar
  add column if not exists tanggal_masuk date,
  add column if not exists kewarganegaraan text,
  add column if not exists nik text,
  add column if not exists nisn text,
  add column if not exists tempat_lahir text,
  add column if not exists agama text,
  add column if not exists no_handphone text,
  add column if not exists nama_ayah_kandung text,
  add column if not exists status_ayah_kandung text,
  add column if not exists nik_ayah text,
  add column if not exists nama_ibu_kandung text,
  add column if not exists status_ibu_kandung text,
  add column if not exists nik_ibu text,
  add column if not exists status_wali text,
  add column if not exists nama_wali text,
  add column if not exists jenjang text,
  add column if not exists tingkat_kelas text,
  add column if not exists kitas text,
  add column if not exists asal_negara text;

create index if not exists pp_santri_nik_idx on public.pp_santri (nik);
create index if not exists pp_santri_nisn_idx on public.pp_santri (nisn);
create index if not exists pp_psb_pendaftar_nik_idx on public.pp_psb_pendaftar (nik);
