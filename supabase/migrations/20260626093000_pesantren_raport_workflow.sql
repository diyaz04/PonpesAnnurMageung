-- Configurable Pesantren raport workflow: academic periods, kitab/pelajaran
-- groups, asatidz-santri assignments, grading details, and published PDFs.

insert into storage.buckets (id, name, public)
values ('pp-raport-pdf', 'pp-raport-pdf', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "pp raport pdf staff upload" on storage.objects;
create policy "pp raport pdf staff upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pp-raport-pdf'
  and public.pp_has_role(array['superadmin', 'admin'])
);

drop policy if exists "pp raport pdf staff update" on storage.objects;
create policy "pp raport pdf staff update" on storage.objects
for update to authenticated
using (
  bucket_id = 'pp-raport-pdf'
  and public.pp_has_role(array['superadmin', 'admin'])
)
with check (
  bucket_id = 'pp-raport-pdf'
  and public.pp_has_role(array['superadmin', 'admin'])
);

drop policy if exists "pp raport pdf public read" on storage.objects;
create policy "pp raport pdf public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'pp-raport-pdf');

create table if not exists public.pp_raport_periode (
  id uuid primary key default gen_random_uuid(),
  tahun_ajaran text not null,
  semester text not null,
  nama text generated always as (tahun_ajaran || ' - Semester ' || semester) stored,
  status text not null default 'draft' check (status in ('draft', 'aktif', 'terbuka', 'ditutup', 'published')),
  tanggal_mulai date,
  tanggal_selesai date,
  catatan text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun_ajaran, semester)
);

create table if not exists public.pp_raport_mapel (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pp_raport_periode(id) on delete cascade,
  kelompok text not null,
  mata_pelajaran text not null,
  kategori text,
  format_nilai text not null default 'angka' check (format_nilai in ('angka', 'huruf', 'predikat')),
  kkm numeric(5, 2),
  urutan int not null default 0,
  created_at timestamptz not null default now(),
  unique (periode_id, kelompok, mata_pelajaran)
);

create table if not exists public.pp_raport_penugasan (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pp_raport_periode(id) on delete cascade,
  mapel_id uuid not null references public.pp_raport_mapel(id) on delete cascade,
  guru_id uuid not null references public.pp_asatidz(id) on delete cascade,
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  kelompok text not null,
  created_at timestamptz not null default now(),
  unique (periode_id, mapel_id, guru_id, santri_id)
);

create table if not exists public.pp_raport_nilai_detail (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  mapel_id uuid not null references public.pp_raport_mapel(id) on delete cascade,
  guru_id uuid references public.pp_asatidz(id) on delete set null,
  nilai text,
  predikat text,
  deskripsi text,
  catatan text,
  updated_at timestamptz not null default now(),
  unique (santri_id, mapel_id)
);

create table if not exists public.pp_raport_publikasi (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pp_raport_periode(id) on delete cascade,
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published')),
  pdf_url text,
  catatan text,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (periode_id, santri_id)
);

alter table public.pp_raport_periode enable row level security;
alter table public.pp_raport_mapel enable row level security;
alter table public.pp_raport_penugasan enable row level security;
alter table public.pp_raport_nilai_detail enable row level security;
alter table public.pp_raport_publikasi enable row level security;

drop trigger if exists set_pp_raport_periode_updated_at on public.pp_raport_periode;
create trigger set_pp_raport_periode_updated_at
before update on public.pp_raport_periode
for each row execute function public.set_updated_at();

drop trigger if exists set_pp_raport_nilai_detail_updated_at on public.pp_raport_nilai_detail;
create trigger set_pp_raport_nilai_detail_updated_at
before update on public.pp_raport_nilai_detail
for each row execute function public.set_updated_at();

drop trigger if exists set_pp_raport_publikasi_updated_at on public.pp_raport_publikasi;
create trigger set_pp_raport_publikasi_updated_at
before update on public.pp_raport_publikasi
for each row execute function public.set_updated_at();

create index if not exists pp_raport_periode_status_idx on public.pp_raport_periode (status);
create index if not exists pp_raport_mapel_periode_kelompok_idx on public.pp_raport_mapel (periode_id, kelompok);
create index if not exists pp_raport_penugasan_guru_idx on public.pp_raport_penugasan (guru_id, periode_id, mapel_id);
create index if not exists pp_raport_penugasan_santri_idx on public.pp_raport_penugasan (santri_id, periode_id);
create index if not exists pp_raport_nilai_detail_santri_idx on public.pp_raport_nilai_detail (santri_id);
create index if not exists pp_raport_publikasi_status_idx on public.pp_raport_publikasi (status);

drop policy if exists "pp raport periode staff read" on public.pp_raport_periode;
create policy "pp raport periode staff read" on public.pp_raport_periode
for select to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or exists (
    select 1
    from public.pp_raport_penugasan rp
    join public.pp_asatidz a on a.id = rp.guru_id
    where rp.periode_id = pp_raport_periode.id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "pp raport periode admin write" on public.pp_raport_periode;
create policy "pp raport periode admin write" on public.pp_raport_periode
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

drop policy if exists "pp raport mapel staff read" on public.pp_raport_mapel;
create policy "pp raport mapel staff read" on public.pp_raport_mapel
for select to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or exists (
    select 1
    from public.pp_raport_penugasan rp
    join public.pp_asatidz a on a.id = rp.guru_id
    where rp.mapel_id = pp_raport_mapel.id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "pp raport mapel admin write" on public.pp_raport_mapel;
create policy "pp raport mapel admin write" on public.pp_raport_mapel
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

drop policy if exists "pp raport penugasan staff read" on public.pp_raport_penugasan;
create policy "pp raport penugasan staff read" on public.pp_raport_penugasan
for select to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or exists (
    select 1
    from public.pp_asatidz a
    where a.id = pp_raport_penugasan.guru_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "pp raport penugasan admin write" on public.pp_raport_penugasan;
create policy "pp raport penugasan admin write" on public.pp_raport_penugasan
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

drop policy if exists "pp raport nilai detail staff read" on public.pp_raport_nilai_detail;
create policy "pp raport nilai detail staff read" on public.pp_raport_nilai_detail
for select to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or exists (
    select 1
    from public.pp_raport_mapel rm
    join public.pp_raport_penugasan rp on rp.mapel_id = rm.id
    join public.pp_asatidz a on a.id = rp.guru_id
    where rm.id = pp_raport_nilai_detail.mapel_id
      and rp.santri_id = pp_raport_nilai_detail.santri_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "pp raport nilai detail staff write" on public.pp_raport_nilai_detail;
create policy "pp raport nilai detail staff write" on public.pp_raport_nilai_detail
for all to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or exists (
    select 1
    from public.pp_raport_mapel rm
    join public.pp_raport_periode pr on pr.id = rm.periode_id
    join public.pp_raport_penugasan rp on rp.mapel_id = rm.id
    join public.pp_asatidz a on a.id = rp.guru_id
    where rm.id = pp_raport_nilai_detail.mapel_id
      and rp.santri_id = pp_raport_nilai_detail.santri_id
      and a.user_id = auth.uid()
      and pr.status in ('aktif', 'terbuka')
  )
)
with check (
  public.pp_has_role(array['superadmin', 'admin'])
  or exists (
    select 1
    from public.pp_raport_mapel rm
    join public.pp_raport_periode pr on pr.id = rm.periode_id
    join public.pp_raport_penugasan rp on rp.mapel_id = rm.id
    join public.pp_asatidz a on a.id = rp.guru_id
    where rm.id = pp_raport_nilai_detail.mapel_id
      and rp.santri_id = pp_raport_nilai_detail.santri_id
      and a.user_id = auth.uid()
      and pr.status in ('aktif', 'terbuka')
  )
);

drop policy if exists "pp raport publikasi staff read" on public.pp_raport_publikasi;
create policy "pp raport publikasi staff read" on public.pp_raport_publikasi
for select to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or exists (
    select 1
    from public.pp_raport_penugasan rp
    join public.pp_asatidz a on a.id = rp.guru_id
    where rp.periode_id = pp_raport_publikasi.periode_id
      and rp.santri_id = pp_raport_publikasi.santri_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "pp raport publikasi admin write" on public.pp_raport_publikasi;
create policy "pp raport publikasi admin write" on public.pp_raport_publikasi
for all to authenticated
using (public.pp_has_role(array['superadmin', 'admin']))
with check (public.pp_has_role(array['superadmin', 'admin']));

create or replace function public.lookup_pesantren_student_record(
  p_kode_unik text,
  p_client_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  headers_text text;
  headers jsonb := '{}'::jsonb;
  ip_key text;
  client_hash text;
  recent_attempts int;
  santri_row public.pp_santri%rowtype;
  tagihan_data jsonb := '[]'::jsonb;
  raport_data jsonb := '[]'::jsonb;
begin
  headers_text := current_setting('request.headers', true);

  if headers_text is not null and headers_text <> '' then
    begin
      headers := headers_text::jsonb;
    exception when others then
      headers := '{}'::jsonb;
    end;
  end if;

  ip_key := coalesce(
    nullif(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1), ''),
    nullif(headers ->> 'cf-connecting-ip', ''),
    nullif(headers ->> 'x-real-ip', ''),
    nullif(p_client_key, ''),
    'unknown'
  );
  client_hash := md5(ip_key);

  delete from public.lp_public_lookup_attempts
  where attempted_at < now() - interval '10 minutes';

  select count(*) into recent_attempts
  from public.lp_public_lookup_attempts
  where entitas = 'pesantren'
    and client_key_hash = client_hash
    and attempted_at >= now() - interval '1 minute';

  if recent_attempts >= 5 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  insert into public.lp_public_lookup_attempts (entitas, client_key_hash)
  values ('pesantren', client_hash);

  select *
  into santri_row
  from public.pp_santri
  where kode_unik = p_kode_unik
     or nis = p_kode_unik
  limit 1;

  if santri_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  select coalesce(jsonb_agg(tagihan_item order by sort_date nulls last), '[]'::jsonb)
  into tagihan_data
  from (
    select
      t.jatuh_tempo as sort_date,
      jsonb_build_object(
        'id', t.id,
        'jenis_tagihan', jt.nama,
        'nominal', t.nominal,
        'status', t.status,
        'jatuh_tempo', t.jatuh_tempo,
        'total_dibayar', coalesce(pay.total_dibayar, 0),
        'sisa_tagihan', greatest(t.nominal - coalesce(pay.total_dibayar, 0), 0),
        'riwayat_pembayaran', coalesce(pay.riwayat, '[]'::jsonb)
      ) as tagihan_item
    from public.keu_tagihan t
    left join public.keu_jenis_tagihan jt on jt.id = t.jenis_tagihan_id
    left join lateral (
      select
        sum(p.jumlah_bayar)::numeric as total_dibayar,
        jsonb_agg(
          jsonb_build_object(
            'jumlah_bayar', p.jumlah_bayar,
            'tanggal_bayar', p.tanggal_bayar,
            'catatan', p.catatan,
            'kuitansi_url', p.kuitansi_url
          )
          order by p.tanggal_bayar desc
        ) as riwayat
      from public.keu_pembayaran p
      where p.tagihan_id = t.id
    ) pay on true
    where t.entitas = 'pesantren'
      and t.anggota_id = santri_row.id
  ) rows;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tahun_ajaran', pr.tahun_ajaran,
        'semester', pr.semester,
        'periode', pr.nama,
        'pdf_url', pub.pdf_url,
        'catatan', pub.catatan,
        'published_at', pub.published_at,
        'nilai', coalesce(nilai.rows, '[]'::jsonb)
      )
      order by pub.published_at desc nulls last
    ),
    '[]'::jsonb
  )
  into raport_data
  from public.pp_raport_publikasi pub
  join public.pp_raport_periode pr on pr.id = pub.periode_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'mata_pelajaran', rm.mata_pelajaran,
        'nilai', nd.nilai,
        'predikat', nd.predikat,
        'deskripsi', nd.deskripsi
      )
      order by rm.urutan, rm.mata_pelajaran
    ) as rows
    from public.pp_raport_mapel rm
    left join public.pp_raport_nilai_detail nd
      on nd.mapel_id = rm.id
     and nd.santri_id = pub.santri_id
    where rm.periode_id = pub.periode_id
      and rm.kelompok = concat('Angkatan ', santri_row.tahun_masuk)
  ) nilai on true
  where pub.santri_id = santri_row.id
    and pub.status = 'published';

  return jsonb_build_object(
    'status', 'ok',
    'santri', jsonb_build_object(
      'foto_url', santri_row.foto_url,
      'nama', santri_row.nama_lengkap,
      'nis', santri_row.nis,
      'kode_unik', santri_row.kode_unik,
      'kelas', concat('Angkatan ', santri_row.tahun_masuk),
      'status', santri_row.status
    ),
    'tagihan', tagihan_data,
    'raport', raport_data
  );
end;
$$;

grant execute on function public.lookup_pesantren_student_record(text, text) to anon, authenticated;
