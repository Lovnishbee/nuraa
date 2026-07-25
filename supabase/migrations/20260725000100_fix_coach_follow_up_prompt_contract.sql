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
    'coach_follow_up',
    'phase4b.v1',
    'coach_follow_up',
    'phase4a.v1',
    'phase4b.v1',
    'phase4b.v1',
    '[]'::jsonb,
    '{"maxOutputTokens": 700}'::jsonb,
    '{"type": "deterministic_coach_follow_up"}'::jsonb,
    'phase4b-coach-follow-up-v1',
    'internal'
  )
on conflict (name, version) do update
set
  task_type = excluded.task_type,
  safety_policy_version = excluded.safety_policy_version,
  context_contract_version = excluded.context_contract_version,
  output_schema_version = excluded.output_schema_version,
  tool_permissions = excluded.tool_permissions,
  token_budget = excluded.token_budget,
  fallback_strategy = excluded.fallback_strategy,
  content_checksum = excluded.content_checksum,
  rollout_status = excluded.rollout_status;

update public.ai_model_policies
set allowed_task_types = array(select distinct unnest(allowed_task_types || array['coach_follow_up']))
where alias = 'nuraa_coach_balanced';

do $$
declare
  contract_count integer;
begin
  select count(*) into contract_count
  from public.prompt_contracts
  where task_type = 'coach_follow_up'
    and version = 'phase4b.v1'
    and context_contract_version = 'phase4b.v1'
    and output_schema_version = 'phase4b.v1';

  if contract_count <> 1 then
    raise exception 'Coach follow-up prompt contract repair failed';
  end if;
end $$;
