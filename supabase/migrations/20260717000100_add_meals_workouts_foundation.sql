-- Nuraa Meals + Workouts foundation.
-- Manual logs only: no AI food recognition, generated workouts, wearables, or payments.

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meal_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name text not null check (char_length(trim(meal_name)) between 1 and 120),
  notes text,
  calories integer check (calories is null or calories between 0 and 5000),
  protein_g numeric check (protein_g is null or protein_g between 0 and 500),
  carbs_g numeric check (carbs_g is null or carbs_g between 0 and 700),
  fat_g numeric check (fat_g is null or fat_g between 0 and 300),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_date date not null,
  activity_type text not null check (activity_type in ('walk', 'run', 'strength', 'mobility', 'yoga', 'cycling', 'sport', 'other')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  intensity text not null default 'moderate' check (intensity in ('easy', 'moderate', 'hard')),
  calories_burned integer check (calories_burned is null or calories_burned between 0 and 5000),
  notes text,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_logs_user_date_idx on public.meal_logs(user_id, meal_date desc, logged_at desc);
create index if not exists workout_logs_user_date_idx on public.workout_logs(user_id, workout_date desc, completed_at desc);

drop trigger if exists meal_logs_set_updated_at on public.meal_logs;
drop trigger if exists workout_logs_set_updated_at on public.workout_logs;
create trigger meal_logs_set_updated_at before update on public.meal_logs for each row execute function public.set_updated_at();
create trigger workout_logs_set_updated_at before update on public.workout_logs for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.meal_logs to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;

alter table public.meal_logs enable row level security;
alter table public.workout_logs enable row level security;

drop policy if exists "Users can select their meal logs" on public.meal_logs;
drop policy if exists "Users can insert their meal logs" on public.meal_logs;
drop policy if exists "Users can update their meal logs" on public.meal_logs;
drop policy if exists "Users can delete their meal logs" on public.meal_logs;
create policy "Users can select their meal logs" on public.meal_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their meal logs" on public.meal_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their meal logs" on public.meal_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their meal logs" on public.meal_logs for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can select their workout logs" on public.workout_logs;
drop policy if exists "Users can insert their workout logs" on public.workout_logs;
drop policy if exists "Users can update their workout logs" on public.workout_logs;
drop policy if exists "Users can delete their workout logs" on public.workout_logs;
create policy "Users can select their workout logs" on public.workout_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their workout logs" on public.workout_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their workout logs" on public.workout_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their workout logs" on public.workout_logs for delete to authenticated using ((select auth.uid()) = user_id);

-- Migration verification helper queries for manual Supabase SQL Editor checks.
-- select relname, relrowsecurity from pg_class where relname in ('meal_logs', 'workout_logs');
-- select tablename, policyname, cmd from pg_policies where schemaname = 'public' and tablename in ('meal_logs', 'workout_logs') order by tablename, policyname;
