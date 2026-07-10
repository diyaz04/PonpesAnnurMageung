-- Ensure a superadmin can access every admin module across Pesantren, SMP,
-- finance, landing content, generated documents, and storage buckets.

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.pp_profiles
      where id = auth.uid()
        and role = 'superadmin'
    )
    or exists (
      select 1
      from public.smp_profiles
      where id = auth.uid()
        and role = 'superadmin'
    ),
    false
  );
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema storage to anon, authenticated;

grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.pp_current_role() to authenticated;
grant execute on function public.smp_current_role() to authenticated;
grant execute on function public.pp_has_role(text[]) to authenticated;
grant execute on function public.smp_has_role(text[]) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_bendahara() to authenticated;

grant all privileges on all tables in schema public to authenticated;
grant all privileges on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

grant select on storage.buckets to anon, authenticated;
grant all privileges on storage.objects to authenticated;

do $$
declare
  table_record record;
begin
  for table_record in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'drop policy if exists "superadmin full access" on %I.%I',
      table_record.schemaname,
      table_record.tablename
    );

    execute format(
      'create policy "superadmin full access" on %I.%I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())',
      table_record.schemaname,
      table_record.tablename
    );
  end loop;
end $$;

drop policy if exists "superadmin storage buckets read" on storage.buckets;
create policy "superadmin storage buckets read" on storage.buckets
for select to authenticated
using (public.is_superadmin());

drop policy if exists "superadmin storage objects read" on storage.objects;
create policy "superadmin storage objects read" on storage.objects
for select to authenticated
using (public.is_superadmin());

drop policy if exists "superadmin storage objects insert" on storage.objects;
create policy "superadmin storage objects insert" on storage.objects
for insert to authenticated
with check (public.is_superadmin());

drop policy if exists "superadmin storage objects update" on storage.objects;
create policy "superadmin storage objects update" on storage.objects
for update to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "superadmin storage objects delete" on storage.objects;
create policy "superadmin storage objects delete" on storage.objects
for delete to authenticated
using (public.is_superadmin());

insert into storage.buckets (id, name, public)
values
  ('santri-foto', 'santri-foto', true),
  ('surat-keluar', 'surat-keluar', false),
  ('siswa-foto', 'siswa-foto', true),
  ('smp-surat-keluar', 'smp-surat-keluar', false),
  ('pp-raport-pdf', 'pp-raport-pdf', false),
  ('smp-raport-pdf', 'smp-raport-pdf', false),
  ('pp-perizinan-pdf', 'pp-perizinan-pdf', false),
  ('pp-psb-bukti', 'pp-psb-bukti', true),
  ('pp-psb-foto', 'pp-psb-foto', true),
  ('smp-spmb-bukti', 'smp-spmb-bukti', true),
  ('smp-spmb-foto', 'smp-spmb-foto', true),
  ('spmb-dokumen', 'spmb-dokumen', false),
  ('landing-assets', 'landing-assets', true),
  ('kuitansi-keuangan', 'kuitansi-keuangan', false)
on conflict (id) do nothing;
