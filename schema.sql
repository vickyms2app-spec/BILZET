-- BILZET V10 Final Offline-First production schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'business' check (role in ('business','ca','dealer')),
  account_status text not null default 'active' check (account_status in ('active','suspended')),
  business_type text default 'retail',
  gst_scheme text default 'regular',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Migration safety: CREATE TABLE IF NOT EXISTS does not add new columns to an older profiles table.
alter table public.profiles add column if not exists account_status text default 'active';
alter table public.profiles add column if not exists business_type text default 'retail';
alter table public.profiles add column if not exists gst_scheme text default 'regular';
create unique index if not exists profiles_email_lower_unique on public.profiles(lower(email));

create table if not exists public.plan_catalog (
  id text primary key check (id in ('free','pro','premium')),
  display_name text not null,
  price_annual numeric(12,2) not null default 0,
  validity_days integer not null default 365 check(validity_days>0),
  included_bills integer,
  unlimited_bills boolean not null default false,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.plan_catalog(id,display_name,price_annual,validity_days,included_bills,unlimited_bills,features,sort_order) values
('free','Free',0,365,100,false,'["First 100 bills included","Extra 500-bill packs available","3 templates","3 themes","Fixed BILZET watermark"]',1),
('pro','Pro',1499,365,null,true,'["Unlimited bills","8 templates","10 themes","WhatsApp PDF","GSTR-1 / 3B draft","CA Connect"]',2),
('premium','Premium',2999,365,null,true,'["Unlimited bills","All templates/themes","Thermal 58mm","Credit/Debit notes","Advanced GST"]',3)
on conflict(id) do update set validity_days=excluded.validity_days,included_bills=excluded.included_bills,unlimited_bills=excluded.unlimited_bills;

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.plan_catalog(id),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check(status in ('active','expired','cancelled')),
  bills_used integer not null default 0 check(bills_used>=0),
  extra_bill_balance integer not null default 0 check(extra_bill_balance>=0),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_invoice_id text not null,
  document_number text not null,
  document_type text not null,
  invoice_date date,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id,local_invoice_id),
  unique(user_id,document_number)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check(status in ('open','in_progress','resolved')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_bilzet_user() returns trigger language plpgsql security definer set search_path=public as $$
declare exp timestamptz := now()+interval '365 days';
declare requested_role text := coalesce(new.raw_user_meta_data->>'role','business');
begin
 insert into public.profiles(id,email,full_name,role,business_type,gst_scheme)
 values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''),case when requested_role in ('business','ca','dealer') then requested_role else 'business' end,coalesce(new.raw_user_meta_data->>'business_type','retail'),coalesce(new.raw_user_meta_data->>'gst_scheme','regular'))
 on conflict(id) do nothing;
 insert into public.subscriptions(user_id,plan_id,starts_at,expires_at,status,bills_used,extra_bill_balance)
 values(new.id,'free',now(),exp,'active',0,0) on conflict(user_id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created_bilzet on auth.users;
create trigger on_auth_user_created_bilzet after insert on auth.users for each row execute function public.handle_new_bilzet_user();

create or replace function public.register_invoice(p_local_invoice_id text,p_document_number text,p_document_type text,p_invoice_date date,p_total numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.subscriptions%rowtype; p public.plan_catalog%rowtype; counts boolean;
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 if exists(select 1 from public.profiles where id=auth.uid() and account_status='suspended') then raise exception 'account_suspended'; end if;
 select * into s from public.subscriptions where user_id=auth.uid() for update;
 if not found then raise exception 'subscription_missing'; end if;
 if s.status<>'active' or s.expires_at<=now() then update public.subscriptions set status='expired',updated_at=now() where user_id=auth.uid(); raise exception 'plan_expired'; end if;
 if exists(select 1 from public.invoice_registry where user_id=auth.uid() and local_invoice_id=p_local_invoice_id) then return jsonb_build_object('ok',true,'already_synced',true,'plan_id',s.plan_id,'bills_used',s.bills_used,'extra_bill_balance',s.extra_bill_balance); end if;
 if exists(select 1 from public.invoice_registry where user_id=auth.uid() and document_number=p_document_number) then raise exception 'duplicate_document_number'; end if;
 select * into p from public.plan_catalog where id=s.plan_id and active=true;
 if not found then raise exception 'plan_missing'; end if;
 counts := p_document_type in ('invoice','billOfSupply');
 if counts and not p.unlimited_bills then
   if s.bills_used < coalesce(p.included_bills,0) then s.bills_used:=s.bills_used+1;
   elsif s.extra_bill_balance>0 then s.extra_bill_balance:=s.extra_bill_balance-1;
   else raise exception 'bill_quota_exhausted'; end if;
   update public.subscriptions set bills_used=s.bills_used,extra_bill_balance=s.extra_bill_balance,updated_at=now() where user_id=auth.uid();
 elsif counts and p.unlimited_bills then
   s.bills_used:=s.bills_used+1;
   update public.subscriptions set bills_used=s.bills_used,updated_at=now() where user_id=auth.uid();
 end if;
 insert into public.invoice_registry(user_id,local_invoice_id,document_number,document_type,invoice_date,total) values(auth.uid(),p_local_invoice_id,p_document_number,p_document_type,p_invoice_date,p_total);
 return jsonb_build_object('ok',true,'plan_id',s.plan_id,'bills_used',s.bills_used,'extra_bill_balance',s.extra_bill_balance);
end $$;

alter table public.profiles enable row level security;
alter table public.plan_catalog enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoice_registry enable row level security;
alter table public.support_tickets enable row level security;
alter table public.admin_audit enable row level security;

drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own subscription read" on public.subscriptions;
drop policy if exists "plans public read" on public.plan_catalog;
drop policy if exists "own tickets read" on public.support_tickets;
drop policy if exists "own tickets create" on public.support_tickets;

revoke all on public.profiles,public.subscriptions,public.invoice_registry,public.support_tickets,public.admin_audit from anon,authenticated;
revoke all on public.plan_catalog from anon,authenticated;
grant select on public.plan_catalog to anon,authenticated;
grant select on public.profiles,public.subscriptions to authenticated;
grant select,insert on public.support_tickets to authenticated;
grant execute on function public.register_invoice(text,text,text,date,numeric) to authenticated;

create policy "own profile read" on public.profiles for select to authenticated using(id=auth.uid());
create policy "own subscription read" on public.subscriptions for select to authenticated using(user_id=auth.uid());
create policy "plans public read" on public.plan_catalog for select to anon,authenticated using(active=true);
create policy "own tickets read" on public.support_tickets for select to authenticated using(user_id=auth.uid());
create policy "own tickets create" on public.support_tickets for insert to authenticated with check(user_id=auth.uid());

-- BILZET V10 Pharmacy Core: immutable cloud archive for medicine bills and H1 records.
-- Detailed medicine master/batch working data stays device-local in this preserved BILZET architecture,
-- while critical pharmacy sale/H1 records are archived in Supabase at bill commit time.
create table if not exists public.pharmacy_sales_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_sale_id text not null,
  invoice_no text not null,
  invoice_date date not null,
  total numeric(14,2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id,local_sale_id),
  unique(user_id,invoice_no)
);

create table if not exists public.pharmacy_h1_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_sale_id text not null,
  invoice_no text not null,
  supply_date date not null,
  prescriber_name text not null,
  prescriber_address text not null,
  patient_name text not null,
  patient_address text not null,
  drug_name text not null,
  generic_name text,
  manufacturer text,
  batch_no text,
  expiry text,
  quantity text not null,
  created_at timestamptz not null default now()
);
create index if not exists pharmacy_h1_user_date_idx on public.pharmacy_h1_archive(user_id,supply_date desc);

alter table public.pharmacy_sales_archive enable row level security;
alter table public.pharmacy_h1_archive enable row level security;
revoke all on public.pharmacy_sales_archive,public.pharmacy_h1_archive from anon,authenticated;

create or replace function public.register_pharmacy_sale(
  p_local_sale_id text,
  p_invoice_no text,
  p_invoice_date date,
  p_total numeric,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  s public.subscriptions%rowtype;
  p public.plan_catalog%rowtype;
  h jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists(select 1 from public.profiles where id=auth.uid() and account_status='suspended') then raise exception 'account_suspended'; end if;

  select * into s from public.subscriptions where user_id=auth.uid() for update;
  if not found then raise exception 'subscription_missing'; end if;
  if s.status<>'active' or s.expires_at<=now() then
    update public.subscriptions set status='expired',updated_at=now() where user_id=auth.uid();
    raise exception 'plan_expired';
  end if;
  if exists(select 1 from public.invoice_registry where user_id=auth.uid() and local_invoice_id=p_local_sale_id) then
    return jsonb_build_object('ok',true,'already_synced',true,'plan_id',s.plan_id,'bills_used',s.bills_used,'extra_bill_balance',s.extra_bill_balance);
  end if;
  if exists(select 1 from public.invoice_registry where user_id=auth.uid() and document_number=p_invoice_no) then
    raise exception 'duplicate_document_number';
  end if;

  select * into p from public.plan_catalog where id=s.plan_id and active=true;
  if not found then raise exception 'plan_missing'; end if;

  if not p.unlimited_bills then
    if s.bills_used < coalesce(p.included_bills,0) then
      s.bills_used:=s.bills_used+1;
    elsif s.extra_bill_balance>0 then
      s.extra_bill_balance:=s.extra_bill_balance-1;
    else
      raise exception 'bill_quota_exhausted';
    end if;
    update public.subscriptions set bills_used=s.bills_used,extra_bill_balance=s.extra_bill_balance,updated_at=now() where user_id=auth.uid();
  else
    update public.subscriptions set bills_used=bills_used+1,updated_at=now() where user_id=auth.uid();
    s.bills_used:=s.bills_used+1;
  end if;

  insert into public.invoice_registry(user_id,local_invoice_id,document_number,document_type,invoice_date,total)
  values(auth.uid(),p_local_sale_id,p_invoice_no,'invoice',p_invoice_date,p_total);

  insert into public.pharmacy_sales_archive(user_id,local_sale_id,invoice_no,invoice_date,total,payload)
  values(auth.uid(),p_local_sale_id,p_invoice_no,p_invoice_date,p_total,coalesce(p_payload,'{}'::jsonb));

  for h in select value from jsonb_array_elements(coalesce(p_payload->'h1_records','[]'::jsonb))
  loop
    insert into public.pharmacy_h1_archive(
      user_id,local_sale_id,invoice_no,supply_date,prescriber_name,prescriber_address,
      patient_name,patient_address,drug_name,generic_name,manufacturer,batch_no,expiry,quantity
    ) values(
      auth.uid(),p_local_sale_id,p_invoice_no,p_invoice_date,
      coalesce(h->>'prescriberName',''),coalesce(h->>'prescriberAddress',''),
      coalesce(h->>'patientName',''),coalesce(h->>'patientAddress',''),
      coalesce(h->>'drugName',''),coalesce(h->>'generic',''),coalesce(h->>'manufacturer',''),
      coalesce(h->>'batchNo',''),coalesce(h->>'expiry',''),coalesce(h->>'quantity','')
    );
  end loop;

  return jsonb_build_object('ok',true,'plan_id',s.plan_id,'bills_used',s.bills_used,'extra_bill_balance',s.extra_bill_balance);
end $$;

grant execute on function public.register_pharmacy_sale(text,text,date,numeric,jsonb) to authenticated;
