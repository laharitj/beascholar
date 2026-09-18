-- Run this once in Supabase Dashboard > SQL Editor.
-- This creates the profile table used by js/auth.js.

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null check (phone ~ '^[0-9]{10}$'),
  user_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists education_level text;
alter table public.users add column if not exists institution text;
alter table public.users add column if not exists field_of_study text;
alter table public.users add column if not exists graduation_year integer;
alter table public.users add column if not exists city text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists linkedin_url text;
alter table public.users add column if not exists class_level text;
alter table public.users add column if not exists country text;
alter table public.users add column if not exists gender text;
alter table public.users add column if not exists religion text;
alter table public.users add column if not exists state text;
alter table public.users add column if not exists course text;
alter table public.users add column if not exists date_of_birth date;
alter table public.users add column if not exists category text;
alter table public.users add column if not exists annual_family_income numeric;
alter table public.users add column if not exists academic_performance text;
alter table public.users add column if not exists scholar_type text;
alter table public.users add column if not exists disability text;
alter table public.users add column if not exists minority text;
alter table public.users add column if not exists residence_type text;

alter table public.users enable row level security;

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
on public.users for insert
with check ((select auth.uid()) = id);

drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
on public.users for select
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
on public.users for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
