-- Nuraa Phase V-C: private-beta weekly reflections.
-- Reflections are generated server-side from deterministic weekly metrics.
-- Browser clients can read their own rows; generation and lifecycle writes stay
-- behind Edge Functions/service role.

create table if not exists public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  week_start_date date not null,
  week_end_date date not null,
  status text not null default 'generated' check (status in ('generated', 'viewed', 'dismissed', 'converted_to_coach', 'expired')),

  summary_payload jsonb not null default '{}'::jsonb,
  deterministic_metrics jsonb not null default '{}'::jsonb,
  source_references jsonb not null default '[]'::jsonb,

  context_envelope_id uuid references public.context_envelopes(id) on delete set null,
  ai_execution_id uuid references public.ai_executions(id) on delete set null,

  viewed_at timestamptz,
  dismissed_at timestamptz,
  converted_to_coach_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, week_start_date, week_end_date)
);

create index if not exists weekly_reflections_user_week_idx
  on public.weekly_reflections(user_id, week_start_date desc, week_end_date desc);
create index if not exists weekly_reflections_user_status_idx
  on public.weekly_reflections(user_id, status, updated_at desc);

drop trigger if exists weekly_reflections_set_updated_at on public.weekly_reflections;
create trigger weekly_reflections_set_updated_at before update on public.weekly_reflections for each row execute function public.set_updated_at();

alter table public.weekly_reflections enable row level security;

revoke all on public.weekly_reflections from anon, authenticated;
grant select on public.weekly_reflections to authenticated;
grant select, insert, update, delete on public.weekly_reflections to service_role;

drop policy if exists "Users can read their weekly reflections" on public.weekly_reflections;
create policy "Users can read their weekly reflections"
  on public.weekly_reflections for select to authenticated
  using ((select auth.uid()) = user_id);

insert into public.ai_feature_flags (feature_name, enabled, rollout_scope, metadata)
values
  ('ENABLE_WEEKLY_REFLECTION', false, 'server', '{}'::jsonb),
  ('ENABLE_WEEKLY_REFLECTION_AI_COPY', false, 'server', '{}'::jsonb)
on conflict (feature_name) do update
set enabled = false,
    rollout_scope = excluded.rollout_scope,
    metadata = excluded.metadata,
    updated_at = now();

update public.ai_model_policies
set allowed_task_types = array(select distinct unnest(allowed_task_types || array['rewrite_weekly_reflection']))
where alias = 'nuraa_fast_structured';

update public.ai_model_policies
set allowed_task_types = array(select distinct unnest(allowed_task_types || array['coach_from_weekly_reflection']))
where alias = 'nuraa_coach_balanced';

insert into public.prompt_contracts (
  name,
  version,
  task_type,
  safety_policy_version,
  context_contract_version,
  output_schema_version,
  tool_permissions,
  token_budget,
  fallback_strategy,
  content_checksum,
  rollout_status
)
values
  (
    'rewrite_weekly_reflection',
    'phase-v-c.v1',
    'rewrite_weekly_reflection',
    'phase4a.v1',
    'phase-v-c.v1',
    'phase-v-c.v1',
    '{}'::jsonb,
    '{"maxOutputTokens":700}'::jsonb,
    '{"type":"deterministic_weekly_reflection"}'::jsonb,
    'phase-v-c-rewrite-weekly-reflection-v1',
    'active'
  ),
  (
    'coach_from_weekly_reflection',
    'phase-v-c.v1',
    'coach_from_weekly_reflection',
    'phase4a.v1',
    'phase-v-c.v1',
    'phase4b.v1',
    '{}'::jsonb,
    '{"maxOutputTokens":700}'::jsonb,
    '{"type":"deterministic_weekly_reflection_coach"}'::jsonb,
    'phase-v-c-coach-from-weekly-reflection-v1',
    'active'
  )
on conflict (name, version) do update
set task_type = excluded.task_type,
    context_contract_version = excluded.context_contract_version,
    output_schema_version = excluded.output_schema_version,
    token_budget = excluded.token_budget,
    fallback_strategy = excluded.fallback_strategy,
    content_checksum = excluded.content_checksum,
    rollout_status = excluded.rollout_status,
    updated_at = now();

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'weekly_reflections'
      and c.relrowsecurity = true
  ) then
    raise exception 'Phase V-C failed: RLS is not enabled on weekly_reflections';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'weekly_reflections'
      and roles::text like '%authenticated%'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Phase V-C failed: authenticated write policy exists on weekly_reflections';
  end if;

  if has_table_privilege('authenticated', 'public.weekly_reflections', 'INSERT')
    or has_table_privilege('authenticated', 'public.weekly_reflections', 'UPDATE')
    or has_table_privilege('authenticated', 'public.weekly_reflections', 'DELETE') then
    raise exception 'Phase V-C failed: authenticated role has direct write privileges on weekly_reflections';
  end if;
end $$;
