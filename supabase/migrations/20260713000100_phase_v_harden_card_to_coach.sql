-- Nuraa Phase V hardening: route proactive card feedback and Coach handoff
-- through server-authoritative Edge Functions only.

revoke insert, update, delete on public.proactive_card_feedback from authenticated;
grant select on public.proactive_card_feedback to authenticated;

drop policy if exists "Users can insert bounded proactive card feedback" on public.proactive_card_feedback;

grant select, insert, update, delete on public.proactive_card_feedback to service_role;

insert into public.ai_feature_flags (feature_name, enabled, rollout_scope, metadata)
values
  ('ENABLE_CARD_TO_COACH', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_CARD_COPY', false, 'server', '{}'::jsonb)
on conflict (feature_name) do update
set enabled = false,
    rollout_scope = excluded.rollout_scope,
    metadata = excluded.metadata,
    updated_at = now();

update public.ai_model_policies
set allowed_task_types = array(select distinct unnest(coalesce(allowed_task_types, '{}'::text[]) || array['coach_from_card']))
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
values (
  'coach_from_card',
  'phase4b.v1',
  'coach_from_card',
  'phase4a.v1',
  'phase4b.v1',
  'phase4b.v1',
  '{}'::jsonb,
  '{"maxOutputTokens":700}'::jsonb,
  '{"type":"deterministic_proactive_card_coach"}'::jsonb,
  'phase-v-b-coach-from-card-v1',
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
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'proactive_card_feedback'
      and roles::text like '%authenticated%'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Phase V hardening failed: authenticated write policy exists on proactive_card_feedback';
  end if;

  if has_table_privilege('authenticated', 'public.proactive_card_feedback', 'INSERT')
    or has_table_privilege('authenticated', 'public.proactive_card_feedback', 'UPDATE')
    or has_table_privilege('authenticated', 'public.proactive_card_feedback', 'DELETE') then
    raise exception 'Phase V hardening failed: authenticated role has direct write privileges on proactive_card_feedback';
  end if;

  if not exists (
    select 1
    from public.prompt_contracts
    where name = 'coach_from_card'
      and version = 'phase4b.v1'
      and rollout_status = 'active'
  ) then
    raise exception 'Phase V hardening failed: coach_from_card prompt contract missing';
  end if;
end $$;
