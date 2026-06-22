-- Role-aware dashboard summary for Pondok Pesantren admin.

create or replace function public.get_pesantren_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_role text;
  active_count int := 0;
  alumni_count int := 0;
  unpaid_count int := null;
  unpaid_nominal numeric := null;
  violation_count int := 0;
begin
  current_role := public.pp_current_role();

  if current_role is null
    or current_role not in ('superadmin', 'admin', 'bendahara', 'guru') then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select count(*) into active_count
  from public.pp_santri
  where status = 'aktif';

  select count(*) into alumni_count
  from public.pp_santri
  where status = 'alumni';

  select count(*) into violation_count
  from public.pp_pelanggaran
  where tanggal >= date_trunc('month', current_date)::date
    and tanggal < (date_trunc('month', current_date) + interval '1 month')::date;

  if current_role in ('superadmin', 'bendahara') then
    select count(*), coalesce(sum(nominal), 0)
    into unpaid_count, unpaid_nominal
    from public.keu_tagihan
    where entitas = 'pesantren'
      and status <> 'lunas';
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'total_santri_aktif', active_count,
    'total_alumni', alumni_count,
    'tagihan_belum_lunas', unpaid_count,
    'nominal_belum_lunas', unpaid_nominal,
    'pelanggaran_bulan_ini', violation_count
  );
end;
$$;

grant execute on function public.get_pesantren_dashboard_stats() to authenticated;
