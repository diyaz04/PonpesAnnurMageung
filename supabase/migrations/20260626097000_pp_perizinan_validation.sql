-- Public validation endpoint for pesantren permission letters.

create or replace function public.validate_pp_perizinan(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  izin_row record;
begin
  select
    i.id,
    i.nomor_surat,
    i.jenis_izin,
    i.tujuan,
    i.alasan,
    i.tanggal_mulai,
    i.tanggal_selesai,
    i.jam_keluar,
    i.jam_kembali,
    i.waktu_kembali_aktual,
    i.penjemput,
    i.status,
    i.file_url,
    i.created_at,
    s.nama_lengkap,
    s.nis,
    s.kelas_pengajian,
    s.tahun_masuk
  into izin_row
  from public.pp_perizinan i
  join public.pp_santri s on s.id = i.santri_id
  where i.id = p_id
  limit 1;

  if izin_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object(
    'status', 'valid',
    'surat', jsonb_build_object(
      'id', izin_row.id,
      'nomor_surat', izin_row.nomor_surat,
      'jenis_izin', izin_row.jenis_izin,
      'tujuan', izin_row.tujuan,
      'alasan', izin_row.alasan,
      'tanggal_mulai', izin_row.tanggal_mulai,
      'tanggal_selesai', izin_row.tanggal_selesai,
      'jam_keluar', izin_row.jam_keluar,
      'jam_kembali', izin_row.jam_kembali,
      'waktu_kembali_aktual', izin_row.waktu_kembali_aktual,
      'penjemput', izin_row.penjemput,
      'status', izin_row.status,
      'file_url', izin_row.file_url,
      'created_at', izin_row.created_at
    ),
    'santri', jsonb_build_object(
      'nama', izin_row.nama_lengkap,
      'nis', izin_row.nis,
      'kelas_pengajian', coalesce(nullif(izin_row.kelas_pengajian, ''), 'Belum diatur'),
      'tahun_masuk', izin_row.tahun_masuk
    )
  );
end;
$$;

grant execute on function public.validate_pp_perizinan(uuid) to anon, authenticated;
