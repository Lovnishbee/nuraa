# Phase 4B Beta Readiness

This checklist is for the tightly controlled Nuraa Coach private beta. Phase 4B remains allowlisted, consent-gated, disabled by default, and grounded in deterministic Nuraa intelligence.

## Preflight

- CI is green for:
  - `npm run lint`
  - `npm run typecheck:ai-runtime`
  - `npm run test`
  - `npm run build`
- Required migrations are applied through the Supabase Dashboard SQL Editor or CLI.
- Docker/local Supabase is optional for local validation.
- No AI flags are enabled by default in production.
- Beta testing happens in preview or staging before production.
- Automated tests use mocked providers or `FakeAIProvider`; no real OpenAI call is required.

## Controlled beta setup

1. Add one approved tester to `public.ai_internal_testers` with:
   - `enabled = true`
   - `consent_granted = true`
2. Enable only the required server environment flags in staging:
   - `AI_ENABLED=true`
   - `AI_INTERNAL_ACCESS_REQUIRED=true`
   - `ENABLE_AI_COACH=true`
   - `ENABLE_AI_ASK_ABOUT_TODAY=true`
   - `ENABLE_AI_SCORE_EXPLANATION=true`
   - `ENABLE_AI_COACH_DASHBOARD_ENTRY=true` only if testing dashboard entry points
3. Enable matching `public.ai_feature_flags` rows for those same flags.
4. Enable the tester’s Coach consent through the app consent screen or controlled `coach-control` path.
5. Confirm a non-tester cannot see Coach navigation or dashboard Coach actions.

## Functional smoke tests

Use one allowlisted staging user with non-sensitive test data.

- Ask About Today from the dashboard creates a conversation and one persisted Nuraa message.
- Explain My Score creates a score-focused conversation and one persisted Nuraa message.
- Start fresh creates a new conversation and pauses the previous active one.
- Follow-up message creates exactly one user message and one Nuraa message.
- Browser retry with the same idempotency key does not duplicate messages.
- Conversation history shows active conversations.
- Archive removes a conversation from active use and makes it read-only.
- Reopen restores an archived conversation to active.
- Delete removes a conversation from normal app flow and prevents follow-up.
- Feedback submits against a real persisted `coach_messages.id`, not a request ID.
- Disabled AI returns safe disabled/fallback behavior.
- Missing Coach consent blocks before context building or provider execution.
- Provider timeout returns deterministic fallback.
- Invalid provider payload returns deterministic fallback.
- S1, S2, and S3 safety routes suppress provider execution.
- New check-in followed by Coach request uses refreshed deterministic context.

## Privacy and security checks

- Browser never receives:
  - provider key
  - service-role key
  - prompt text
  - raw context envelope
  - raw provider response
  - model names
- Cross-user conversation IDs cannot be opened, followed up, archived, reopened, deleted, or used for feedback.
- Archived and deleted conversations do not appear in active context.
- S2/S3 raw user crisis text is not stored as ordinary conversation history.
- Coach messages do not create durable memory.
- Provider calls are stateless and do not use `previous_response_id`.
- OpenAI tools, web search, file search, code interpreter, MCP, and function calls remain disabled.

## Real provider smoke test

Run only after automated checks pass.

1. Use one allowlisted staging user.
2. Send one low-risk wellness prompt.
3. Run one score explanation.
4. Simulate provider timeout and confirm fallback.
5. Simulate invalid structured output and confirm validation fallback.
6. Run one S1, one S2, and one S3 safety test.
7. Confirm model output is validated before display.
8. Confirm no real sensitive user data is used.

## Manual verification SQL

Use the Supabase Dashboard SQL Editor if local Docker is unavailable.

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('user_ai_preferences', 'coach_conversations', 'coach_messages', 'coach_feedback')
order by table_name;

select column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'ai_executions' and column_name = 'coach_message_id')
    or (table_name = 'coach_messages' and column_name in ('ai_execution_id', 'client_request_key'))
  )
order by table_name, column_name;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name in ('user_ai_preferences', 'coach_conversations', 'coach_messages', 'coach_feedback')
order by table_name, privilege_type;
```

Expected result: authenticated has read access only for these Coach tables; writes are controlled through Edge Functions/service role.

## Local commands

```bash
npm run lint
npm run typecheck:ai-runtime
npm run test
npm run build
```

Optional, if Supabase CLI and Docker are working:

```bash
supabase migration list --local
supabase functions serve ai-gateway --env-file supabase/.env.local
```

Do not run destructive Supabase commands for this smoke test.
