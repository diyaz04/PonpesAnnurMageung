-- Prevent duplicate payments and overpayment at database level.

create or replace function public.prevent_duplicate_or_overpayment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_status text;
  invoice_nominal numeric;
  total_paid numeric := 0;
  remaining numeric := 0;
begin
  select status, nominal
  into invoice_status, invoice_nominal
  from public.keu_tagihan
  where id = new.tagihan_id
  for update;

  if not found then
    raise exception 'Tagihan tidak ditemukan.';
  end if;

  if invoice_status = 'lunas' then
    raise exception 'Tagihan ini sudah lunas, tidak bisa menerima pembayaran lagi.';
  end if;

  select coalesce(sum(jumlah_bayar), 0)
  into total_paid
  from public.keu_pembayaran
  where tagihan_id = new.tagihan_id;

  remaining := greatest(invoice_nominal - total_paid, 0);

  if total_paid + new.jumlah_bayar > invoice_nominal then
    raise exception 'Jumlah pembayaran melebihi sisa tagihan (sisa: Rp %).',
      trim(to_char(remaining, '999G999G999G999G990'));
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_or_overpayment_trigger on public.keu_pembayaran;
create trigger prevent_duplicate_or_overpayment_trigger
before insert on public.keu_pembayaran
for each row execute function public.prevent_duplicate_or_overpayment();
