-- Run this after supabase-schema.sql in Supabase Dashboard > SQL Editor.
-- The importer stores both sheet shapes in this canonical table and preserves
-- every original column in raw_data.

create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  source_sheet text not null,
  source_row integer not null,
  source_key text generated always as (source_sheet || ':' || source_row::text) stored,
  name text,
  state text,
  target text,
  classification text,
  eligibility text,
  benefits text,
  official_portal text,
  provider text,
  category text,
  income_limit numeric,
  last_date text,
  source text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key)
);

alter table public.scholarships add column if not exists source_sheet text;
alter table public.scholarships add column if not exists source_row integer;
alter table public.scholarships add column if not exists id uuid default gen_random_uuid();
alter table public.scholarships add column if not exists source_key text generated always as (source_sheet || ':' || source_row::text) stored;
alter table public.scholarships add column if not exists name text;
alter table public.scholarships add column if not exists state text;
alter table public.scholarships add column if not exists target text;
alter table public.scholarships add column if not exists classification text;
alter table public.scholarships add column if not exists eligibility text;
alter table public.scholarships add column if not exists benefits text;
alter table public.scholarships add column if not exists official_portal text;
alter table public.scholarships add column if not exists provider text;
alter table public.scholarships add column if not exists category text;
alter table public.scholarships add column if not exists income_limit numeric;
alter table public.scholarships add column if not exists last_date text;
alter table public.scholarships add column if not exists source text;
alter table public.scholarships add column if not exists raw_data jsonb default '{}'::jsonb;
alter table public.scholarships add column if not exists created_at timestamptz default now();
alter table public.scholarships add column if not exists updated_at timestamptz default now();

create unique index if not exists scholarships_source_key_idx
  on public.scholarships (source_sheet, source_row);

alter table public.scholarships enable row level security;

drop policy if exists "Anyone can read scholarships" on public.scholarships;
create policy "Anyone can read scholarships"
on public.scholarships for select
using (true);

create or replace function public.set_scholarship_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scholarships_updated_at on public.scholarships;
create trigger scholarships_updated_at
before update on public.scholarships
for each row execute function public.set_scholarship_updated_at();

create index if not exists scholarships_state_idx on public.scholarships (state);