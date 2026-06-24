-- Nuraa Phase 1: user-owned wellness foundation. No service-role access is
-- required from the browser; all public tables are constrained by RLS.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  date_of_birth date,
  age integer check (age between 1 and 120),
  gender text,
  location_city text,
  location_country text,
  timezone text not null default 'Asia/Kolkata',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.health_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  activity_level text,
  fitness_level text,
  medical_conditions text[] not null default '{}',
  injuries text[] not null default '{}',
  allergies text[] not null default '{}',
  dietary_restrictions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_type text not null,
  goal_label text not null,
  priority integer not null default 1 check (priority > 0),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  diet_preference text,
  cuisine_preferences text[] not null default '{}',
  disliked_foods text[] not null default '{}',
  preferred_workout_types text[] not null default '{}',
  available_equipment text[] not null default '{}',
  preferred_workout_time text,
  work_type text,
  work_schedule text,
  commute_minutes integer check (commute_minutes >= 0),
  travel_frequency text,
  notification_preference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  calendar_connected boolean not null default false,
  location_enabled boolean not null default false,
  notifications_enabled boolean not null default false,
  camera_enabled boolean not null default false,
  microphone_enabled boolean not null default false,
  health_reports_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nuraa_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_date date not null,
  total_score integer check (total_score between 0 and 100),
  readiness_category text,
  score_reason text,
  recommended_focus text,
  created_at timestamptz not null default now(),
  unique (user_id, score_date)
);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null,
  mood text,
  energy_level integer check (energy_level between 1 and 5),
  stress_level integer check (stress_level between 1 and 5),
  sleep_quality integer check (sleep_quality between 1 and 5),
  sleep_hours numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_name text not null default 'free',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_goals_user_id_idx on public.user_goals(user_id);
create index nuraa_scores_user_date_idx on public.nuraa_scores(user_id, score_date desc);
create index daily_checkins_user_date_idx on public.daily_checkins(user_id, checkin_date desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger health_profiles_set_updated_at before update on public.health_profiles for each row execute function public.set_updated_at();
create trigger user_preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger user_permissions_set_updated_at before update on public.user_permissions for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- A profile must exist before a new user can use user-owned tables. Metadata is
-- copied for display only; authorization is always based on auth.uid().
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke execute on function public.handle_new_user() from public;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.profiles enable row level security;
alter table public.health_profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_permissions enable row level security;
alter table public.nuraa_scores enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.subscriptions enable row level security;

create policy "Users can select their profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can insert their profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update their profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users can delete their profile" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy "Users can select their health profile" on public.health_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their health profile" on public.health_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their health profile" on public.health_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their health profile" on public.health_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their goals" on public.user_goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their goals" on public.user_goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their goals" on public.user_goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their goals" on public.user_goals for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their preferences" on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their preferences" on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their preferences" on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their preferences" on public.user_preferences for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their permissions" on public.user_permissions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their permissions" on public.user_permissions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their permissions" on public.user_permissions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their permissions" on public.user_permissions for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their scores" on public.nuraa_scores for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their scores" on public.nuraa_scores for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their scores" on public.nuraa_scores for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their scores" on public.nuraa_scores for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their checkins" on public.daily_checkins for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their checkins" on public.daily_checkins for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their checkins" on public.daily_checkins for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their checkins" on public.daily_checkins for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their subscription" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their subscription" on public.subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their subscription" on public.subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their subscription" on public.subscriptions for delete to authenticated using ((select auth.uid()) = user_id);
