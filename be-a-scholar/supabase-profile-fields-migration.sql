-- Run this in Supabase Dashboard > SQL Editor.
-- Uses the existing public.users table. It does not create a new table.

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

-- Ask PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';
