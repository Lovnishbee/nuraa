-- Nuraa Phase 3: deterministic intelligence foundation.
-- Browser clients use the publishable Supabase key; every new public table is
-- protected with user-owned RLS policies.

alter table public.nuraa_scores
  add column if not exists confidence integer check (confidence between 0 and 100),
  add column if not exists primary_driver text,
  add column if not exists limiting_factor text;

create table if not exists public.health_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  signal_date date not null,
  sleep_hours numeric,
  sleep_quality integer check (sleep_quality between 1 and 5),
  stress_level integer check (stress_level between 1 and 5),
  energy_level integer check (energy_level between 1 and 5),
  soreness_level integer check (soreness_level between 1 and 5),
  motivation_level integer check (motivation_level between 1 and 5),
  mood text,
  activity_score integer check (activity_score between 0 and 100),
  nutrition_score integer check (nutrition_score between 0 and 100),
  hydration_score integer check (hydration_score between 0 and 100),
  recovery_score integer check (recovery_score between 0 and 100),
  sleep_score integer check (sleep_score between 0 and 100),
  stress_score integer check (stress_score between 0 and 100),
  overall_signal_confidence integer check (overall_signal_confidence between 0 and 100),
  raw_signal_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, signal_date)
);

create table if not exists public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brief_date date not null,
  headline text,
  summary text,
  focus_items jsonb,
  insight text,
  tone text,
  source text not null default 'rules_engine',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_date)
);

create table if not exists public.insight_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_date date not null,
  rule_id text,
  title text,
  description text,
  category text,
  severity text,
  recommendation text,
  created_at timestamptz not null default now()
);

create table if not exists public.score_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_date date not null,
  sleep_score integer check (sleep_score between 0 and 100),
  stress_score integer check (stress_score between 0 and 100),
  recovery_score integer check (recovery_score between 0 and 100),
  activity_score integer check (activity_score between 0 and 100),
  nutrition_score integer check (nutrition_score between 0 and 100),
  hydration_score integer check (hydration_score between 0 and 100),
  confidence integer check (confidence between 0 and 100),
  primary_driver text,
  limiting_factor text,
  created_at timestamptz not null default now(),
  unique (user_id, score_date)
);

create index if not exists health_signals_user_date_idx on public.health_signals(user_id, signal_date desc);
create index if not exists daily_briefs_user_date_idx on public.daily_briefs(user_id, brief_date desc);
create index if not exists insight_events_user_date_idx on public.insight_events(user_id, event_date desc);
create index if not exists score_factors_user_date_idx on public.score_factors(user_id, score_date desc);
create unique index if not exists nuraa_scores_user_date_key on public.nuraa_scores(user_id, score_date);

drop trigger if exists health_signals_set_updated_at on public.health_signals;
drop trigger if exists daily_briefs_set_updated_at on public.daily_briefs;

create trigger health_signals_set_updated_at before update on public.health_signals for each row execute function public.set_updated_at();
create trigger daily_briefs_set_updated_at before update on public.daily_briefs for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.health_signals to authenticated;
grant select, insert, update, delete on public.daily_briefs to authenticated;
grant select, insert, update, delete on public.insight_events to authenticated;
grant select, insert, update, delete on public.score_factors to authenticated;

alter table public.health_signals enable row level security;
alter table public.daily_briefs enable row level security;
alter table public.insight_events enable row level security;
alter table public.score_factors enable row level security;

drop policy if exists "Users can select their health signals" on public.health_signals;
drop policy if exists "Users can insert their health signals" on public.health_signals;
drop policy if exists "Users can update their health signals" on public.health_signals;
drop policy if exists "Users can delete their health signals" on public.health_signals;
create policy "Users can select their health signals" on public.health_signals for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their health signals" on public.health_signals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their health signals" on public.health_signals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their health signals" on public.health_signals for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can select their daily briefs" on public.daily_briefs;
drop policy if exists "Users can insert their daily briefs" on public.daily_briefs;
drop policy if exists "Users can update their daily briefs" on public.daily_briefs;
drop policy if exists "Users can delete their daily briefs" on public.daily_briefs;
create policy "Users can select their daily briefs" on public.daily_briefs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their daily briefs" on public.daily_briefs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their daily briefs" on public.daily_briefs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their daily briefs" on public.daily_briefs for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can select their insight events" on public.insight_events;
drop policy if exists "Users can insert their insight events" on public.insight_events;
drop policy if exists "Users can update their insight events" on public.insight_events;
drop policy if exists "Users can delete their insight events" on public.insight_events;
create policy "Users can select their insight events" on public.insight_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their insight events" on public.insight_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their insight events" on public.insight_events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their insight events" on public.insight_events for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can select their score factors" on public.score_factors;
drop policy if exists "Users can insert their score factors" on public.score_factors;
drop policy if exists "Users can update their score factors" on public.score_factors;
drop policy if exists "Users can delete their score factors" on public.score_factors;
create policy "Users can select their score factors" on public.score_factors for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their score factors" on public.score_factors for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their score factors" on public.score_factors for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their score factors" on public.score_factors for delete to authenticated using ((select auth.uid()) = user_id);
