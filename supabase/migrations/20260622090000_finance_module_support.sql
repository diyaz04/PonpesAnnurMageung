-- Support centralized finance module receipts and automatic invoice status.

insert into storage.buckets (id, name, public)
values ('kuitansi-keuangan', 'kuitansi-keuangan', false)
on conflict (id) do nothing;

drop policy if exists "kuitansi bendahara upload" on storage.objects;
create policy "kuitansi bendahara upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'kuitansi-keuangan' and public.is_bendahara());

drop policy if exists "kuitansi bendahara read" on storage.objects;
create policy "kuitansi bendahara read" on storage.objects
for select to authenticated
using (bucket_id = 'kuitansi-keuangan' and public.is_bendahara());

create or replace function public.sync_keu_tagihan_status(p_tagihan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_paid numeric := 0;
  invoice_nominal numeric := 0;
  next_status text := 'belum_lunas';
begin
  select nominal into invoice_nominal
  from public.keu_tagihan
  where id = p_tagihan_id;

  select coalesce(sum(jumlah_bayar), 0)
  into total_paid
  from public.keu_pembayaran
  where tagihan_id = p_tagihan_id;

  if total_paid >= invoice_nominal then
    next_status := 'lunas';
  elsif total_paid > 0 then
    next_status := 'cicilan';
  else
    next_status := 'belum_lunas';
  end if;

  update public.keu_tagihan
  set status = next_status
  where id = p_tagihan_id;
end;
$$;

create or replace function public.sync_keu_tagihan_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_keu_tagihan_status(old.tagihan_id);
    return old;
  end if;

  perform public.sync_keu_tagihan_status(new.tagihan_id);
  return new;
end;
$$;

drop trigger if exists sync_keu_tagihan_status_after_payment on public.keu_pembayaran;
create trigger sync_keu_tagihan_status_after_payment
after insert or update or delete on public.keu_pembayaran
for each row execute function public.sync_keu_tagihan_status_trigger();

grant execute on function public.sync_keu_tagihan_status(uuid) to authenticated;
