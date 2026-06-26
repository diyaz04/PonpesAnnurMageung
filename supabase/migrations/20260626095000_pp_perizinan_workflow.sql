-- Pesantren izin workflow: permission records, generated PDF proof,
-- and public record lookup integration.

insert into storage.buckets (id, name, public)
values ('pp-perizinan-pdf', 'pp-perizinan-pdf', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "pp perizinan pdf staff upload" on storage.objects;
create policy "pp perizinan pdf staff upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pp-perizinan-pdf'
  and public.pp_has_role(array['superadmin', 'admin', 'guru'])
);

drop policy if exists "pp perizinan pdf public read" on storage.objects;
create policy "pp perizinan pdf public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'pp-perizinan-pdf');

create table if not exists public.pp_perizinan (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references public.pp_santri(id) on delete cascade,
  jenis_izin text not null default 'Pulang',
  tujuan text,
  alasan text not null,
  tanggal_mulai date not null,
  tanggal_selesai date,
  jam_keluar time,
  jam_kembali time,
  penjemput text,
  no_hp_penjemput text,
  penanggung_jawab text,
  status text not null default 'disetujui' check (status in ('diajukan', 'disetujui', 'selesai', 'ditolak', 'dibatalkan')),
  catatan text,
  nomor_surat text,
  file_url text,
  dibuat_oleh uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pp_perizinan enable row level security;

drop trigger if exists set_pp_perizinan_updated_at on public.pp_perizinan;
create trigger set_pp_perizinan_updated_at
before update on public.pp_perizinan
for each row execute function public.set_updated_at();

create index if not exists pp_perizinan_santri_idx on public.pp_perizinan (santri_id, tanggal_mulai desc);
create index if not exists pp_perizinan_status_idx on public.pp_perizinan (status);

drop policy if exists "pp perizinan staff read" on public.pp_perizinan;
create policy "pp perizinan staff read" on public.pp_perizinan
for select to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or public.pp_is_assigned_santri(santri_id)
);

drop policy if exists "pp perizinan staff write" on public.pp_perizinan;
create policy "pp perizinan staff write" on public.pp_perizinan
for all to authenticated
using (
  public.pp_has_role(array['superadmin', 'admin'])
  or (
    public.pp_current_role() = 'guru'
    and public.pp_is_assigned_santri(santri_id)
  )
)
with check (
  public.pp_has_role(array['superadmin', 'admin'])
  or (
    public.pp_current_role() = 'guru'
    and public.pp_is_assigned_santri(santri_id)
  )
);

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
  perizinan_data jsonb := '[]'::jsonb;
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
      and rm.kelompok = coalesce(nullif(santri_row.kelas_pengajian, ''), 'Belum diatur')
  ) nilai on true
  where pub.santri_id = santri_row.id
    and pub.status = 'published';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'jenis_izin', jenis_izin,
        'tujuan', tujuan,
        'alasan', alasan,
        'tanggal_mulai', tanggal_mulai,
        'tanggal_selesai', tanggal_selesai,
        'jam_keluar', jam_keluar,
        'jam_kembali', jam_kembali,
        'penjemput', penjemput,
        'status', status,
        'nomor_surat', nomor_surat,
        'file_url', file_url,
        'created_at', created_at
      )
      order by tanggal_mulai desc, created_at desc
    ),
    '[]'::jsonb
  )
  into perizinan_data
  from (
    select *
    from public.pp_perizinan
    where santri_id = santri_row.id
    order by tanggal_mulai desc, created_at desc
    limit 10
  ) izin_rows;

  return jsonb_build_object(
    'status', 'ok',
    'santri', jsonb_build_object(
      'foto_url', santri_row.foto_url,
      'nama', santri_row.nama_lengkap,
      'nis', santri_row.nis,
      'kode_unik', santri_row.kode_unik,
      'kelas', coalesce(nullif(santri_row.kelas_pengajian, ''), 'Belum diatur'),
      'tahun_masuk', santri_row.tahun_masuk,
      'status', santri_row.status
    ),
    'tagihan', tagihan_data,
    'raport', raport_data,
    'perizinan', perizinan_data
  );
end;
$$;

grant execute on function public.lookup_pesantren_student_record(text, text) to anon, authenticated;
