-- Support landing content admin portal.

insert into storage.buckets (id, name, public)
values ('landing-assets', 'landing-assets', true)
on conflict (id) do nothing;

drop policy if exists "landing assets admin upload" on storage.objects;
create policy "landing assets admin upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'landing-assets' and public.is_platform_admin());

drop policy if exists "landing assets public read" on storage.objects;
create policy "landing assets public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'landing-assets');

alter table public.lp_saran_kritik
add column if not exists status text not null default 'baru'
check (status in ('baru', 'dibaca', 'ditindak'));

alter table public.lp_saran_kritik
add column if not exists catatan_admin text;

create index if not exists lp_saran_kritik_entitas_status_idx
on public.lp_saran_kritik (entitas, status, created_at desc);
