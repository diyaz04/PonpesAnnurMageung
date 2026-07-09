-- Public validation support for SMP generated letters.

create or replace function public.validate_smp_surat_keluar(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_surat public.smp_surat_keluar%rowtype;
begin
  select *
  into v_surat
  from public.smp_surat_keluar
  where id = p_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
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
    )
  );
end;
$$;

grant execute on function public.validate_smp_surat_keluar(uuid) to anon, authenticated;

drop policy if exists "smp surat keluar validation read" on storage.objects;
create policy "smp surat keluar validation read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'smp-surat-keluar');
