-- Public validation support for generated pesantren letters.

create or replace function public.validate_pp_surat_keluar(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_surat public.pp_surat_keluar%rowtype;
  v_santri public.pp_santri%rowtype;
begin
  select *
  into v_surat
  from public.pp_surat_keluar
  where id = p_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_surat.santri_id is not null then
    select *
    into v_santri
    from public.pp_santri
    where id = v_surat.santri_id;
  end if;

  return jsonb_build_object(
    'status', 'valid',
    'surat', jsonb_build_object(
      'id', v_surat.id,
      'nomor_surat', v_surat.nomor_surat,
      'jenis_surat', v_surat.jenis_surat,
      'perihal', v_surat.perihal,
      'ditujukan', v_surat.ditujukan,
      'tanggal_surat', v_surat.tanggal_surat,
      'file_url', v_surat.file_url,
      'created_at', v_surat.created_at
    ),
    'santri',
      case
        when v_surat.santri_id is null or v_santri.id is null then null
        else jsonb_build_object(
          'nama', v_santri.nama_lengkap,
          'nis', v_santri.nis,
          'kelas_pengajian', v_santri.kelas_pengajian,
          'tahun_masuk', v_santri.tahun_masuk
        )
      end
  );
end;
$$;

grant execute on function public.validate_pp_surat_keluar(uuid) to anon, authenticated;

create or replace function public.pp_surat_keluar_file_exists(p_name text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.pp_surat_keluar
    where file_url = p_name
  );
$$;

grant execute on function public.pp_surat_keluar_file_exists(text) to anon, authenticated;

drop policy if exists "pp surat keluar validation read" on storage.objects;
create policy "pp surat keluar validation read" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'surat-keluar'
  and public.pp_surat_keluar_file_exists(name)
);
