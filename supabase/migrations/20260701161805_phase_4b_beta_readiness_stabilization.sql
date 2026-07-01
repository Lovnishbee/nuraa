-- Nuraa Phase 4B beta-readiness stabilization.
-- Adds persisted Coach message identity, transaction-safe message appends,
-- and narrows browser write access to server-controlled Edge Function paths.

alter table public.ai_executions
  add column if not exists coach_message_id uuid null
  references public.coach_messages(id)
  on delete set null;

alter table public.coach_messages
  add column if not exists ai_execution_id uuid null
  references public.ai_executions(id)
  on delete set null,
  add column if not exists client_request_key text null;

create unique index if not exists coach_messages_ai_execution_unique
  on public.coach_messages(ai_execution_id)
  where ai_execution_id is not null;

create unique index if not exists coach_messages_user_request_unique
  on public.coach_messages(conversation_id, role, client_request_key)
  where client_request_key is not null;

create or replace function public.append_coach_message(
  p_user_id uuid,
  p_conversation_id uuid,
  p_role text,
  p_task_type text,
  p_message_type text,
  p_content text,
  p_structured_payload jsonb,
  p_source_references jsonb,
  p_validation_status text,
  p_client_request_key text default null,
  p_ai_execution_id uuid default null
)
returns table(id uuid, sequence_number integer, created_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_conversation public.coach_conversations%rowtype;
  v_sequence_number integer;
begin
  select *
    into v_conversation
  from public.coach_conversations
  where coach_conversations.id = p_conversation_id
    and coach_conversations.user_id = p_user_id
  for update;

  if not found then
    raise exception 'CONVERSATION_NOT_FOUND';
  end if;

  if v_conversation.status <> 'active'
    or v_conversation.archived_at is not null
    or v_conversation.deleted_at is not null then
    raise exception 'CONVERSATION_NOT_ACTIVE';
  end if;

  if p_client_request_key is not null then
    return query
      select cm.id, cm.sequence_number, cm.created_at
      from public.coach_messages cm
      where cm.conversation_id = p_conversation_id
        and cm.role = p_role
        and cm.client_request_key = p_client_request_key
      limit 1;
    if found then
      return;
    end if;
  end if;

  if p_ai_execution_id is not null then
    return query
      select cm.id, cm.sequence_number, cm.created_at
      from public.coach_messages cm
      where cm.ai_execution_id = p_ai_execution_id
      limit 1;
    if found then
      return;
    end if;
  end if;

  select coalesce(max(cm.sequence_number), 0) + 1
    into v_sequence_number
  from public.coach_messages cm
  where cm.conversation_id = p_conversation_id;

  return query
    insert into public.coach_messages (
      conversation_id,
      user_id,
      sequence_number,
      role,
      task_type,
      message_type,
      content,
      structured_payload,
      source_references,
      validation_status,
      client_request_key,
      ai_execution_id
    )
    values (
      p_conversation_id,
      p_user_id,
      v_sequence_number,
      p_role,
      p_task_type,
      p_message_type,
      p_content,
      p_structured_payload,
      p_source_references,
      p_validation_status,
      p_client_request_key,
      p_ai_execution_id
    )
    returning coach_messages.id, coach_messages.sequence_number, coach_messages.created_at;

  update public.coach_conversations
  set last_active_at = now(),
      updated_at = now()
  where coach_conversations.id = p_conversation_id;
end;
$$;

revoke all on function public.append_coach_message(uuid, uuid, text, text, text, text, jsonb, jsonb, text, text, uuid) from public;
grant execute on function public.append_coach_message(uuid, uuid, text, text, text, text, jsonb, jsonb, text, text, uuid) to service_role;

revoke all on public.user_ai_preferences from anon, authenticated;
revoke all on public.coach_conversations from anon, authenticated;
revoke all on public.coach_messages from anon, authenticated;
revoke all on public.coach_feedback from anon, authenticated;

grant select on public.user_ai_preferences to authenticated;
grant select on public.coach_conversations to authenticated;
grant select on public.coach_messages to authenticated;
grant select on public.coach_feedback to authenticated;

grant select, insert, update, delete on public.user_ai_preferences to service_role;
grant select, insert, update, delete on public.coach_conversations to service_role;
grant select, insert, update, delete on public.coach_messages to service_role;
grant select, insert, update, delete on public.coach_feedback to service_role;

drop policy if exists "Users can create their AI preferences" on public.user_ai_preferences;
drop policy if exists "Users can update their AI preferences" on public.user_ai_preferences;
drop policy if exists "Users can archive or delete their coach conversations" on public.coach_conversations;
drop policy if exists "Users can create their coach feedback" on public.coach_feedback;
drop policy if exists "Users can delete their coach feedback" on public.coach_feedback;

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
  ('coach_follow_up', 'phase4b.v1', 'coach_follow_up', 'phase4a.v1', 'phase4b.v1', 'phase4b.v1', '[]'::jsonb, '{"maxOutputTokens": 700}'::jsonb, '{"type": "deterministic_coach_follow_up"}'::jsonb, 'phase4b-coach-follow-up-v1', 'internal')
on conflict (name, version) do nothing;

do $$
declare
  v_authenticated_write_grant_count integer;
  v_authenticated_write_policy_count integer;
  v_append_execute_count integer;
  v_missing_column_count integer;
begin
  select count(*) into v_missing_column_count
  from (
    values
      ('ai_executions', 'coach_message_id'),
      ('coach_messages', 'ai_execution_id'),
      ('coach_messages', 'client_request_key')
  ) as expected(table_name, column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = expected.table_name
      and c.column_name = expected.column_name
  );

  if v_missing_column_count <> 0 then
    raise exception 'Phase 4B stabilization verification failed: expected columns missing';
  end if;

  select count(*) into v_authenticated_write_grant_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee = 'authenticated'
    and table_name in ('user_ai_preferences', 'coach_conversations', 'coach_messages', 'coach_feedback')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE');

  if v_authenticated_write_grant_count <> 0 then
    raise exception 'Phase 4B stabilization verification failed: authenticated coach write grants exist';
  end if;

  select count(*) into v_authenticated_write_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('user_ai_preferences', 'coach_conversations', 'coach_messages', 'coach_feedback')
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and 'authenticated'::name = any(roles);

  if v_authenticated_write_policy_count <> 0 then
    raise exception 'Phase 4B stabilization verification failed: authenticated coach write policies exist';
  end if;

  select count(*) into v_append_execute_count
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'append_coach_message'
    and grantee = 'service_role'
    and privilege_type = 'EXECUTE';

  if v_append_execute_count = 0 then
    raise exception 'Phase 4B stabilization verification failed: append function execute grant missing';
  end if;
end $$;
