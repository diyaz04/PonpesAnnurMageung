-- Add violation history to public student record lookups.

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
  pelanggaran_data jsonb := '[]'::jsonb;
  total_poin_pelanggaran int := 0;
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
        'waktu_kembali_aktual', waktu_kembali_aktual,
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

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'tanggal', tanggal,
          'nama_pelanggaran', nama_pelanggaran,
          'poin', poin,
          'tingkatan', tingkatan,
          'keterangan', keterangan
        )
        order by tanggal desc, created_at desc
      ),
      '[]'::jsonb
    ),
    coalesce(sum(poin), 0)::int
  into pelanggaran_data, total_poin_pelanggaran
  from (
    select
      p.tanggal,
      p.created_at,
      coalesce(j.nama, 'Pelanggaran') as nama_pelanggaran,
      coalesce(j.bobot_poin, 0) as poin,
      coalesce(j.tingkatan, '-') as tingkatan,
      p.keterangan
    from public.pp_pelanggaran p
    left join public.pp_pelanggaran_jenis j on j.id = p.jenis_id
    where p.santri_id = santri_row.id
    order by p.tanggal desc, p.created_at desc
  ) pelanggaran_rows;

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
    'perizinan', perizinan_data,
    'pelanggaran', pelanggaran_data,
    'total_poin_pelanggaran', total_poin_pelanggaran
  );
end;
$$;

grant execute on function public.lookup_pesantren_student_record(text, text) to anon, authenticated;

create or replace function public.lookup_smp_student_record(
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
  siswa_row public.smp_siswa%rowtype;
  tagihan_data jsonb := '[]'::jsonb;
  raport_data jsonb := '[]'::jsonb;
  pelanggaran_data jsonb := '[]'::jsonb;
  total_poin_pelanggaran int := 0;
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
  where entitas = 'smp'
    and client_key_hash = client_hash
    and attempted_at >= now() - interval '1 minute';

  if recent_attempts >= 5 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  insert into public.lp_public_lookup_attempts (entitas, client_key_hash)
  values ('smp', client_hash);

  select *
  into siswa_row
  from public.smp_siswa
  where kode_unik = p_kode_unik
     or nis = p_kode_unik
  limit 1;

  if siswa_row.id is null then
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
    where t.entitas = 'smp'
      and t.anggota_id = siswa_row.id
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
  from public.smp_raport_publikasi pub
  join public.smp_raport_periode pr on pr.id = pub.periode_id
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
    from public.smp_raport_mapel rm
    left join public.smp_raport_nilai_detail nd
      on nd.mapel_id = rm.id
     and nd.siswa_id = pub.siswa_id
    where rm.periode_id = pub.periode_id
      and rm.kelas = coalesce(siswa_row.kelas, rm.kelas)
  ) nilai on true
  where pub.siswa_id = siswa_row.id
    and pub.status = 'published';

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'tanggal', tanggal,
          'nama_pelanggaran', nama_pelanggaran,
          'poin', poin,
          'tingkatan', tingkatan,
          'keterangan', keterangan
        )
        order by tanggal desc, created_at desc
      ),
      '[]'::jsonb
    ),
    coalesce(sum(poin), 0)::int
  into pelanggaran_data, total_poin_pelanggaran
  from (
    select
      p.tanggal,
      p.created_at,
      coalesce(j.nama, 'Pelanggaran') as nama_pelanggaran,
      coalesce(j.bobot_poin, 0) as poin,
      coalesce(j.tingkatan, '-') as tingkatan,
      p.keterangan
    from public.smp_pelanggaran p
    left join public.smp_pelanggaran_jenis j on j.id = p.jenis_id
    where p.siswa_id = siswa_row.id
    order by p.tanggal desc, p.created_at desc
  ) pelanggaran_rows;

  return jsonb_build_object(
    'status', 'ok',
    'peserta', jsonb_build_object(
      'foto_url', siswa_row.foto_url,
      'nama', siswa_row.nama_lengkap,
      'nis', siswa_row.nis,
      'kode_unik', siswa_row.kode_unik,
      'kelas', coalesce(siswa_row.kelas, concat('Angkatan ', siswa_row.tahun_masuk)),
      'status', siswa_row.status
    ),
    'tagihan', tagihan_data,
    'raport', raport_data,
    'pelanggaran', pelanggaran_data,
    'total_poin_pelanggaran', total_poin_pelanggaran
  );
end;
$$;

grant execute on function public.lookup_smp_student_record(text, text) to anon, authenticated;
