-- SMP public lookup and SPMB document upload support.

insert into storage.buckets (id, name, public)
values ('spmb-dokumen', 'spmb-dokumen', false)
on conflict (id) do nothing;

drop policy if exists "spmb dokumen public upload" on storage.objects;
create policy "spmb dokumen public upload" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'spmb-dokumen');

drop policy if exists "spmb dokumen admin read" on storage.objects;
create policy "spmb dokumen admin read" on storage.objects
for select to authenticated
using (bucket_id = 'spmb-dokumen' and public.is_platform_admin());

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
        'mata_pelajaran', rc.mata_pelajaran,
        'periode', rc.periode,
        'nilai', rn.nilai
      )
      order by rn.created_at desc
    ),
    '[]'::jsonb
  )
  into raport_data
  from public.smp_raport_nilai rn
  join public.smp_raport_config rc on rc.id = rn.config_id
  where rn.siswa_id = siswa_row.id;

  return jsonb_build_object(
    'status', 'ok',
    'peserta', jsonb_build_object(
      'foto_url', siswa_row.foto_url,
      'nama', siswa_row.nama_lengkap,
      'nis', siswa_row.nis,
      'kelas', coalesce(siswa_row.kelas, concat('Angkatan ', siswa_row.tahun_masuk)),
      'status', siswa_row.status
    ),
    'tagihan', tagihan_data,
    'raport', raport_data
  );
end;
$$;

grant execute on function public.lookup_smp_student_record(text, text) to anon, authenticated;
