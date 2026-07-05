-- Dynamic achievement categories and fields for pesantren student progress.

create table if not exists public.pp_capaian_kategori (
  id uuid primary key default gen_random_uuid(),
  nama_kategori text not null,
  deskripsi text,
  aktif boolean not null default true,
  urutan int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists pp_capaian_kategori_nama_unique
on public.pp_capaian_kategori (nama_kategori);

create table if not exists public.pp_capaian_field (
  id uuid primary key default gen_random_uuid(),
  kategori_id uuid not null references public.pp_capaian_kategori(id) on delete cascade,
  field_key text not null,
  field_label text not null,
  field_type text not null check (field_type in ('text', 'number', 'select', 'toggle', 'textarea')),
  field_options jsonb,
  wajib boolean not null default false,
  urutan int not null default 0,
  unique (kategori_id, field_key)
);

alter table public.pp_capaian
  add column if not exists kategori_id uuid references public.pp_capaian_kategori(id) on delete set null,
  add column if not exists data_dinamis jsonb not null default '{}'::jsonb;

alter table public.pp_capaian
  alter column jenis drop not null,
  alter column detail drop not null;

alter table public.pp_capaian_riwayat
  add column if not exists kategori_id uuid references public.pp_capaian_kategori(id) on delete set null,
  add column if not exists data_dinamis jsonb not null default '{}'::jsonb;

alter table public.pp_capaian_riwayat
  alter column jenis drop not null,
  alter column detail drop not null;

alter table public.pp_capaian_kategori enable row level security;
alter table public.pp_capaian_field enable row level security;

drop policy if exists "pp capaian kategori staff read" on public.pp_capaian_kategori;
create policy "pp capaian kategori staff read" on public.pp_capaian_kategori
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin', 'guru']));

drop policy if exists "pp capaian kategori admin write" on public.pp_capaian_kategori;
create policy "pp capaian kategori admin write" on public.pp_capaian_kategori
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

drop policy if exists "pp capaian field staff read" on public.pp_capaian_field;
create policy "pp capaian field staff read" on public.pp_capaian_field
for select to authenticated
using (public.pp_has_role(array['superadmin', 'admin', 'guru']));

drop policy if exists "pp capaian field admin write" on public.pp_capaian_field;
create policy "pp capaian field admin write" on public.pp_capaian_field
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

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
    kategori_id,
    data_dinamis,
    aksi
  )
  values (
    new.id,
    new.santri_id,
    new.jenis,
    new.detail,
    new.progres,
    new.guru_id,
    new.kategori_id,
    coalesce(new.data_dinamis, '{}'::jsonb),
    lower(tg_op)
  );

  return new;
end;
$$;

do $$
declare
  quran_id uuid;
  kitab_id uuid;
begin
  insert into public.pp_capaian_kategori (nama_kategori, deskripsi, aktif, urutan)
  values ('Hafalan Al-Qur''an', 'Capaian hafalan Al-Qur''an per juz, surat, ayat, status, dan penilaian.', true, 1)
  on conflict do nothing;

  select id into quran_id
  from public.pp_capaian_kategori
  where nama_kategori = 'Hafalan Al-Qur''an'
  order by created_at
  limit 1;

  insert into public.pp_capaian_field (kategori_id, field_key, field_label, field_type, field_options, wajib, urutan)
  values
    (quran_id, 'juz', 'Juz', 'number', null, true, 1),
    (quran_id, 'surat', 'Surat', 'text', null, true, 2),
    (quran_id, 'ayat', 'Ayat', 'text', null, true, 3),
    (quran_id, 'status', 'Status', 'select', '["Tuntas", "Belum Tuntas"]'::jsonb, true, 4),
    (quran_id, 'penilaian', 'Penilaian', 'select', '["Mumtaz", "Jayyid Zidan", "Jayyid"]'::jsonb, false, 5)
  on conflict (kategori_id, field_key) do nothing;

  insert into public.pp_capaian_kategori (nama_kategori, deskripsi, aktif, urutan)
  values ('Hafalan Kitab', 'Kategori hafalan kitab. Opsi penilaian dapat diedit admin sesuai kebutuhan kitab lain.', true, 2)
  on conflict do nothing;

  select id into kitab_id
  from public.pp_capaian_kategori
  where nama_kategori = 'Hafalan Kitab'
  order by created_at
  limit 1;

  insert into public.pp_capaian_field (kategori_id, field_key, field_label, field_type, field_options, wajib, urutan)
  values
    (kitab_id, 'nama_kitab', 'Nama Kitab', 'text', null, true, 1),
    (kitab_id, 'bab', 'Bab', 'text', null, true, 2),
    (kitab_id, 'penilaian', 'Penilaian', 'select', '["Mumtaz", "Jayyid Zidan", "Jayyid"]'::jsonb, false, 3)
  on conflict (kategori_id, field_key) do nothing;
end;
$$;
