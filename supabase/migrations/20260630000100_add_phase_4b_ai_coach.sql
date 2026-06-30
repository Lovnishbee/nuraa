-- Nuraa Phase 4B: private-beta AI Coach conversations.
-- Conversation state is owned by Nuraa. Browser clients never write Nuraa messages.

create table if not exists public.user_ai_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  ai_coaching_enabled boolean not null default false,
  ai_coaching_policy_version text,
  ai_coaching_consented_at timestamptz,
  ai_coaching_disabled_at timestamptz,
  response_detail text not null default 'balanced' check (response_detail in ('concise', 'balanced', 'detailed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_point text not null,
  initial_task_type text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'resolved', 'archived', 'deleted')),
  deterministic_title text,
  latest_context_envelope_id uuid references public.context_envelopes(id),
  last_context_at timestamptz,
  last_active_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sequence_number integer not null,
  role text not null check (role in ('user', 'nuraa', 'system')),
  task_type text not null,
  message_type text not null check (message_type in ('coach_opening', 'score_explanation', 'coach_follow_up', 'clarifying_question', 'safety_response', 'fallback')),
  content text,
  structured_payload jsonb,
  source_references jsonb,
  validation_status text not null,
  created_at timestamptz not null default now(),
  unique (conversation_id, sequence_number)
);

create table if not exists public.coach_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.coach_conversations(id) on delete cascade,
  message_id uuid not null references public.coach_messages(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('helpful', 'not_helpful', 'too_generic', 'not_relevant', 'too_much_detail', 'not_enough_detail', 'poor_timing')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists user_ai_preferences_user_idx on public.user_ai_preferences(user_id);
create index if not exists coach_conversations_user_active_idx on public.coach_conversations(user_id, last_active_at desc) where deleted_at is null;
create index if not exists coach_messages_conversation_sequence_idx on public.coach_messages(conversation_id, sequence_number);
create index if not exists coach_feedback_user_created_idx on public.coach_feedback(user_id, created_at desc);

drop trigger if exists user_ai_preferences_set_updated_at on public.user_ai_preferences;
drop trigger if exists coach_conversations_set_updated_at on public.coach_conversations;
create trigger user_ai_preferences_set_updated_at before update on public.user_ai_preferences for each row execute function public.set_updated_at();
create trigger coach_conversations_set_updated_at before update on public.coach_conversations for each row execute function public.set_updated_at();

alter table public.user_ai_preferences enable row level security;
alter table public.coach_conversations enable row level security;
alter table public.coach_messages enable row level security;
alter table public.coach_feedback enable row level security;

revoke all on public.user_ai_preferences from anon, authenticated;
revoke all on public.coach_conversations from anon, authenticated;
revoke all on public.coach_messages from anon, authenticated;
revoke all on public.coach_feedback from anon, authenticated;

grant select, insert, update on public.user_ai_preferences to authenticated;
grant select on public.coach_conversations to authenticated;
grant update (status, archived_at, deleted_at, last_active_at, updated_at) on public.coach_conversations to authenticated;
grant select on public.coach_messages to authenticated;
grant select, insert, delete on public.coach_feedback to authenticated;

grant select, insert, update, delete on public.user_ai_preferences to service_role;
grant select, insert, update, delete on public.coach_conversations to service_role;
grant select, insert, update, delete on public.coach_messages to service_role;
grant select, insert, update, delete on public.coach_feedback to service_role;

drop policy if exists "Users can read their AI preferences" on public.user_ai_preferences;
create policy "Users can read their AI preferences"
  on public.user_ai_preferences for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their AI preferences" on public.user_ai_preferences;
create policy "Users can create their AI preferences"
  on public.user_ai_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their AI preferences" on public.user_ai_preferences;
create policy "Users can update their AI preferences"
  on public.user_ai_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their coach conversations" on public.coach_conversations;
create policy "Users can read their coach conversations"
  on public.coach_conversations for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can archive or delete their coach conversations" on public.coach_conversations;
create policy "Users can archive or delete their coach conversations"
  on public.coach_conversations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their coach messages" on public.coach_messages;
create policy "Users can read their coach messages"
  on public.coach_messages for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their coach feedback" on public.coach_feedback;
create policy "Users can read their coach feedback"
  on public.coach_feedback for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their coach feedback" on public.coach_feedback;
create policy "Users can create their coach feedback"
  on public.coach_feedback for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their coach feedback" on public.coach_feedback;
create policy "Users can delete their coach feedback"
  on public.coach_feedback for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into public.ai_feature_flags (feature_name, enabled, rollout_scope, metadata)
values
  ('ENABLE_AI_COACH', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_COACH_DASHBOARD_ENTRY', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_COACH_HISTORY', false, 'server', '{}'::jsonb),
  ('ENABLE_AI_COACH_FEEDBACK', false, 'server', '{}'::jsonb)
on conflict (feature_name) do nothing;

update public.ai_model_policies
set allowed_task_types = array(select distinct unnest(allowed_task_types || array['coach_follow_up']))
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
  ('coach_follow_up', 'phase4a.v1', 'coach_follow_up', 'phase4a.v1', 'phase4a.v1', 'phase4b.v1', '[]'::jsonb, '{"maxOutputTokens": 700}'::jsonb, '{"type": "deterministic_coach_follow_up"}'::jsonb, 'phase4b-coach-follow-up-v1', 'internal')
on conflict (name, version) do nothing;

do $$
declare
  missing_rls_count integer;
  authenticated_message_write_policy_count integer;
  missing_flag_count integer;
begin
  select count(*) into missing_rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('user_ai_preferences', 'coach_conversations', 'coach_messages', 'coach_feedback')
    and c.relrowsecurity is false;

  if missing_rls_count > 0 then
    raise exception 'Phase 4B verification failed: coach table missing RLS';
  end if;

  select count(*) into authenticated_message_write_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'coach_messages'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and 'authenticated'::name = any(roles);

  if authenticated_message_write_policy_count <> 0 then
    raise exception 'Phase 4B verification failed: authenticated coach_messages write policy exists';
  end if;

  select 4 - count(*) into missing_flag_count
  from public.ai_feature_flags
  where feature_name in (
    'ENABLE_AI_COACH',
    'ENABLE_AI_COACH_DASHBOARD_ENTRY',
    'ENABLE_AI_COACH_HISTORY',
    'ENABLE_AI_COACH_FEEDBACK'
  );

  if missing_flag_count <> 0 then
    raise exception 'Phase 4B verification failed: coach feature flag seeds missing';
  end if;
end $$;
