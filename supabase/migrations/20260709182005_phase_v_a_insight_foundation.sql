-- Nuraa Phase V-A: deterministic proactive insight foundation.
-- This phase stores candidate insights for internal review only. It does not
-- create dashboard cards, feedback, weekly reflections, or AI-written copy.

create table if not exists public.insight_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  health_date date not null,
  theme_key text not null,
  candidate_hash text not null,
  data_window_start date not null,
  data_window_end date not null,

  candidate_type text not null check (candidate_type in ('observation', 'opportunity', 'attention', 'celebration', 'data_gap')),
  category text not null check (category in ('sleep', 'stress', 'recovery', 'energy', 'activity', 'nutrition', 'hydration', 'mood', 'consistency', 'goal_progress', 'readiness', 'data_gap', 'weekly_pattern', 'coach_followup')),
  severity text not null check (severity in ('low', 'medium', 'high')),
  confidence_score integer not null check (confidence_score between 0 and 100),
  confidence_label text not null check (confidence_label in ('high', 'moderate', 'low', 'insufficient')),

  deterministic_title text not null,
  deterministic_summary text not null,
  recommended_action jsonb,

  evidence_json jsonb not null default '{}'::jsonb,
  source_references jsonb not null default '[]'::jsonb,

  ranking_score numeric,
  status text not null default 'candidate' check (status in ('candidate', 'approved', 'suppressed', 'expired', 'converted_to_card', 'rejected')),

  eligible_from timestamptz not null default now(),
  expires_at timestamptz not null,

  suppression_reason text,
  created_by_engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, health_date, theme_key, created_by_engine_version)
);

create table if not exists public.proactive_guidance_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,

  proactive_guidance_enabled boolean not null default true,
  max_cards_per_day integer not null default 3 check (max_cards_per_day between 0 and 3),

  muted_categories jsonb not null default '[]'::jsonb,
  reduced_categories jsonb not null default '[]'::jsonb,

  last_preference_update_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists insight_candidates_user_health_date_idx
  on public.insight_candidates(user_id, health_date desc);
create index if not exists insight_candidates_user_status_idx
  on public.insight_candidates(user_id, status, eligible_from desc);
create index if not exists insight_candidates_user_theme_idx
  on public.insight_candidates(user_id, theme_key, created_at desc);
create index if not exists proactive_guidance_preferences_enabled_idx
  on public.proactive_guidance_preferences(user_id, proactive_guidance_enabled);

drop trigger if exists insight_candidates_set_updated_at on public.insight_candidates;
drop trigger if exists proactive_guidance_preferences_set_updated_at on public.proactive_guidance_preferences;
create trigger insight_candidates_set_updated_at before update on public.insight_candidates for each row execute function public.set_updated_at();
create trigger proactive_guidance_preferences_set_updated_at before update on public.proactive_guidance_preferences for each row execute function public.set_updated_at();

alter table public.insight_candidates enable row level security;
alter table public.proactive_guidance_preferences enable row level security;

revoke all on public.insight_candidates from anon, authenticated;
revoke all on public.proactive_guidance_preferences from anon, authenticated;

grant select on public.insight_candidates to authenticated;
grant select on public.proactive_guidance_preferences to authenticated;

grant select, insert, update, delete on public.insight_candidates to service_role;
grant select, insert, update, delete on public.proactive_guidance_preferences to service_role;

drop policy if exists "Users can read their insight candidates" on public.insight_candidates;
create policy "Users can read their insight candidates"
  on public.insight_candidates for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their proactive guidance preferences" on public.proactive_guidance_preferences;
create policy "Users can read their proactive guidance preferences"
  on public.proactive_guidance_preferences for select to authenticated
  using ((select auth.uid()) = user_id);

insert into public.ai_feature_flags (feature_name, enabled, rollout_scope, metadata)
values
  ('ENABLE_PROACTIVE_INTELLIGENCE', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_CARDS', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_CARD_COPY', false, 'server', '{}'::jsonb),
  ('ENABLE_CARD_FEEDBACK', false, 'server', '{}'::jsonb),
  ('ENABLE_WEEKLY_REFLECTION', false, 'server', '{}'::jsonb),
  ('ENABLE_WEEKLY_REFLECTION_AI_COPY', false, 'server', '{}'::jsonb),
  ('ENABLE_CARD_TO_COACH', false, 'server', '{}'::jsonb),
  ('ENABLE_PHASE_V_DEV_SURFACE', false, 'server', '{}'::jsonb)
on conflict (feature_name) do update
set enabled = false,
    rollout_scope = excluded.rollout_scope,
    metadata = excluded.metadata,
    updated_at = now();

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('insight_candidates', 'proactive_guidance_preferences')
      and c.relrowsecurity = true
    group by n.nspname
    having count(*) = 2
  ) then
    raise exception 'Phase V-A failed: RLS is not enabled on all proactive tables';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('insight_candidates', 'proactive_guidance_preferences')
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
      and roles::text like '%authenticated%'
  ) then
    raise exception 'Phase V-A failed: authenticated write policy exists on proactive tables';
  end if;

  if has_table_privilege('authenticated', 'public.insight_candidates', 'INSERT')
    or has_table_privilege('authenticated', 'public.insight_candidates', 'UPDATE')
    or has_table_privilege('authenticated', 'public.insight_candidates', 'DELETE') then
    raise exception 'Phase V-A failed: authenticated role has direct write privileges on insight_candidates';
  end if;

  if has_table_privilege('authenticated', 'public.proactive_guidance_preferences', 'INSERT')
    or has_table_privilege('authenticated', 'public.proactive_guidance_preferences', 'UPDATE')
    or has_table_privilege('authenticated', 'public.proactive_guidance_preferences', 'DELETE') then
    raise exception 'Phase V-A failed: authenticated role has direct write privileges on proactive_guidance_preferences';
  end if;

  if exists (
    select 1
    from public.ai_feature_flags
    where feature_name in (
      'ENABLE_PROACTIVE_INTELLIGENCE',
      'ENABLE_AI_CARDS',
      'ENABLE_AI_CARD_COPY',
      'ENABLE_CARD_FEEDBACK',
      'ENABLE_WEEKLY_REFLECTION',
      'ENABLE_WEEKLY_REFLECTION_AI_COPY',
      'ENABLE_CARD_TO_COACH',
      'ENABLE_PHASE_V_DEV_SURFACE'
    )
    and enabled is true
  ) then
    raise exception 'Phase V-A failed: Phase V flags must seed disabled';
  end if;
end $$;
