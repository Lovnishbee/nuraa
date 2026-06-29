-- Nuraa Phase 4A: controlled server-side AI runtime.
-- AI is disabled by default. Browser clients cannot write runtime/config tables.

create table if not exists public.ai_model_policies (
  id uuid primary key default gen_random_uuid(),
  alias text unique not null,
  provider text not null,
  model_env_key text not null,
  allowed_task_types text[] not null,
  structured_output_enabled boolean not null default true,
  streaming_enabled boolean not null default false,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_feature_flags (
  id uuid primary key default gen_random_uuid(),
  feature_name text unique not null,
  enabled boolean not null default false,
  rollout_scope text not null default 'server',
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_contracts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  task_type text not null,
  safety_policy_version text not null,
  context_contract_version text not null,
  output_schema_version text not null,
  tool_permissions jsonb not null default '[]'::jsonb,
  token_budget jsonb not null,
  fallback_strategy jsonb not null,
  content_checksum text not null,
  rollout_status text not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version)
);

create table if not exists public.ai_internal_testers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  consent_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.context_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_type text not null,
  trigger_type text not null,
  feature_name text not null,
  requested_at timestamptz not null default now()
);

create table if not exists public.context_envelopes (
  id uuid primary key default gen_random_uuid(),
  context_request_id uuid not null references public.context_requests(id) on delete cascade,
  schema_version text not null,
  context_hash text not null,
  sensitivity_level text not null,
  expires_at timestamptz not null,
  invalidation_status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.context_items (
  id uuid primary key default gen_random_uuid(),
  context_envelope_id uuid not null references public.context_envelopes(id) on delete cascade,
  category text not null,
  source_reference_id uuid,
  relevance_score numeric,
  confidence numeric,
  freshness_score numeric,
  sensitivity_level text not null,
  inclusion_reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_type text not null,
  prompt_contract_id uuid not null references public.prompt_contracts(id),
  context_envelope_id uuid references public.context_envelopes(id),
  model_policy_id uuid references public.ai_model_policies(id),
  status text not null,
  safety_route text,
  fallback_used boolean not null default false,
  latency_ms integer,
  input_token_count integer,
  output_token_count integer,
  error_code text,
  idempotency_key text,
  request_hash text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_responses (
  id uuid primary key default gen_random_uuid(),
  ai_execution_id uuid not null references public.ai_executions(id) on delete cascade,
  schema_version text not null,
  validated_payload jsonb not null,
  validation_status text not null,
  response_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_tool_executions (
  id uuid primary key default gen_random_uuid(),
  ai_execution_id uuid not null references public.ai_executions(id) on delete cascade,
  tool_name text not null,
  input_schema_version text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists context_requests_user_requested_idx on public.context_requests(user_id, requested_at desc);
create index if not exists context_envelopes_request_idx on public.context_envelopes(context_request_id);
create index if not exists context_items_envelope_idx on public.context_items(context_envelope_id);
create index if not exists ai_executions_user_started_idx on public.ai_executions(user_id, started_at desc);
create index if not exists ai_responses_execution_idx on public.ai_responses(ai_execution_id);
create unique index if not exists ai_executions_idempotency_key_idx
  on public.ai_executions(user_id, task_type, idempotency_key)
  where idempotency_key is not null;

drop trigger if exists ai_model_policies_set_updated_at on public.ai_model_policies;
drop trigger if exists ai_feature_flags_set_updated_at on public.ai_feature_flags;
drop trigger if exists prompt_contracts_set_updated_at on public.prompt_contracts;
drop trigger if exists ai_internal_testers_set_updated_at on public.ai_internal_testers;

create trigger ai_model_policies_set_updated_at before update on public.ai_model_policies for each row execute function public.set_updated_at();
create trigger ai_feature_flags_set_updated_at before update on public.ai_feature_flags for each row execute function public.set_updated_at();
create trigger prompt_contracts_set_updated_at before update on public.prompt_contracts for each row execute function public.set_updated_at();
create trigger ai_internal_testers_set_updated_at before update on public.ai_internal_testers for each row execute function public.set_updated_at();

alter table public.ai_model_policies enable row level security;
alter table public.ai_feature_flags enable row level security;
alter table public.prompt_contracts enable row level security;
alter table public.ai_internal_testers enable row level security;
alter table public.context_requests enable row level security;
alter table public.context_envelopes enable row level security;
alter table public.context_items enable row level security;
alter table public.ai_executions enable row level security;
alter table public.ai_responses enable row level security;
alter table public.ai_tool_executions enable row level security;

revoke all on public.ai_model_policies from anon, authenticated;
revoke all on public.ai_feature_flags from anon, authenticated;
revoke all on public.prompt_contracts from anon, authenticated;
revoke all on public.ai_internal_testers from anon, authenticated;
revoke all on public.context_requests from anon, authenticated;
revoke all on public.context_envelopes from anon, authenticated;
revoke all on public.context_items from anon, authenticated;
revoke all on public.ai_executions from anon, authenticated;
revoke all on public.ai_responses from anon, authenticated;
revoke all on public.ai_tool_executions from anon, authenticated;

grant select, insert, update, delete on public.ai_model_policies to service_role;
grant select, insert, update, delete on public.ai_feature_flags to service_role;
grant select, insert, update, delete on public.prompt_contracts to service_role;
grant select, insert, update, delete on public.ai_internal_testers to service_role;
grant select, insert, update, delete on public.context_requests to service_role;
grant select, insert, update, delete on public.context_envelopes to service_role;
grant select, insert, update, delete on public.context_items to service_role;
grant select, insert, update, delete on public.ai_executions to service_role;
grant select, insert, update, delete on public.ai_responses to service_role;
grant select, insert, update, delete on public.ai_tool_executions to service_role;

insert into public.ai_feature_flags (feature_name, enabled, rollout_scope, metadata)
values
  ('AI_ENABLED', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_INTERNAL_TESTS', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_DAILY_BRIEF', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_SCORE_EXPLANATION', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_ASK_ABOUT_TODAY', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_STREAMING', false, 'server', '{}'::jsonb)
on conflict (feature_name) do nothing;

insert into public.ai_model_policies (alias, provider, model_env_key, allowed_task_types, structured_output_enabled, streaming_enabled, status)
values
  ('nuraa_fast_structured', 'openai', 'AI_MODEL_FAST_STRUCTURED', array['rewrite_daily_brief', 'explain_score', 'ask_about_today'], true, false, 'active'),
  ('nuraa_coach_balanced', 'openai', 'AI_MODEL_COACH_BALANCED', array['ask_about_today'], true, false, 'active')
on conflict (alias) do nothing;

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
  ('rewrite_daily_brief', 'phase4a.v1', 'rewrite_daily_brief', 'phase4a.v1', 'phase4a.v1', 'phase4a.v1', '[]'::jsonb, '{"maxOutputTokens": 450}'::jsonb, '{"type": "existing_daily_brief"}'::jsonb, 'phase4a-rewrite-daily-brief-v1', 'internal'),
  ('explain_score', 'phase4a.v1', 'explain_score', 'phase4a.v1', 'phase4a.v1', 'phase4a.v1', '[]'::jsonb, '{"maxOutputTokens": 650}'::jsonb, '{"type": "deterministic_score_explanation"}'::jsonb, 'phase4a-explain-score-v1', 'internal'),
  ('ask_about_today', 'phase4a.v1', 'ask_about_today', 'phase4a.v1', 'phase4a.v1', 'phase4a.v1', '[]'::jsonb, '{"maxOutputTokens": 700}'::jsonb, '{"type": "deterministic_today_summary"}'::jsonb, 'phase4a-ask-about-today-v1', 'internal')
on conflict (name, version) do nothing;

do $$
declare
  missing_rls_count integer;
  authenticated_policy_count integer;
  missing_seed_count integer;
begin
  select count(*) into missing_rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'ai_model_policies',
      'ai_feature_flags',
      'prompt_contracts',
      'ai_internal_testers',
      'context_requests',
      'context_envelopes',
      'context_items',
      'ai_executions',
      'ai_responses',
      'ai_tool_executions'
    )
    and c.relrowsecurity is false;

  if missing_rls_count > 0 then
    raise exception 'Phase 4A verification failed: AI runtime table missing RLS';
  end if;

  select count(*) into authenticated_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'ai_model_policies',
      'ai_feature_flags',
      'prompt_contracts',
      'ai_internal_testers',
      'context_requests',
      'context_envelopes',
      'context_items',
      'ai_executions',
      'ai_responses',
      'ai_tool_executions'
    )
    and 'authenticated' = any(roles);

  if authenticated_policy_count > 0 then
    raise exception 'Phase 4A verification failed: authenticated policies exist on AI runtime tables';
  end if;

  select 6 - count(*) into missing_seed_count
  from public.ai_feature_flags
  where feature_name in (
    'AI_ENABLED',
    'ENABLE_AI_INTERNAL_TESTS',
    'ENABLE_AI_DAILY_BRIEF',
    'ENABLE_AI_SCORE_EXPLANATION',
    'ENABLE_AI_ASK_ABOUT_TODAY',
    'ENABLE_AI_STREAMING'
  );

  if missing_seed_count <> 0 then
    raise exception 'Phase 4A verification failed: feature flag seeds missing';
  end if;
end $$;
