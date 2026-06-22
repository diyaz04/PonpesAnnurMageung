-- Make superadmin platform-wide and keep bendahara as a central finance role.

insert into public.smp_profiles (id, role, nama)
select id, role, nama
from public.pp_profiles
where role in ('superadmin', 'bendahara')
on conflict (id) do nothing;

insert into public.pp_profiles (id, role, nama)
select id, role, nama
from public.smp_profiles
where role in ('superadmin', 'bendahara')
on conflict (id) do nothing;

update public.smp_profiles
set role = 'superadmin',
    nama = pp.nama
from public.pp_profiles pp
where smp_profiles.id = pp.id
  and pp.role = 'superadmin'
  and smp_profiles.role <> 'superadmin';

update public.pp_profiles
set role = 'superadmin',
    nama = smp.nama
from public.smp_profiles smp
where pp_profiles.id = smp.id
  and smp.role = 'superadmin'
  and pp_profiles.role <> 'superadmin';
