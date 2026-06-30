# Phase 4B Coach Smoke Test

Phase 4B is a private-beta AI Coach. Deterministic Nuraa intelligence remains the source of truth. Coach responses explain approved context; they do not diagnose, prescribe, change scores, create durable memory, or use provider-managed conversation history.

## Local setup

Run:

```bash
npm run lint
npm run typecheck:ai-runtime
npm run test
npm run build
```

If Supabase CLI and Docker Desktop are available:

```bash
supabase migration list --local
supabase functions serve ai-gateway --env-file supabase/.env.local
```

Automated tests use `FakeAIProvider` or mocked providers. Do not use production data or real user health information in local smoke tests.

## Enable one internal beta tester

Using a secure server/admin workflow, add or update:

```sql
insert into public.ai_internal_testers (user_id, enabled, consent_granted)
values ('<profile-id>', true, true)
on conflict (user_id)
do update set enabled = true, consent_granted = true, updated_at = now();
```

Enable only the minimum flags needed in the server environment and `ai_feature_flags`:

```text
AI_ENABLED=true
ENABLE_AI_ASK_ABOUT_TODAY=true
ENABLE_AI_SCORE_EXPLANATION=true
ENABLE_AI_COACH=true
ENABLE_AI_COACH_DASHBOARD_ENTRY=true
ENABLE_AI_COACH_HISTORY=true
ENABLE_AI_COACH_FEEDBACK=true
AI_INTERNAL_ACCESS_REQUIRED=true
```

The user must also enable `ai_coaching` consent from the Coach consent screen or Profile control.

## Manual smoke matrix

- Ask About Today:
  - Open `/app/dashboard` as an eligible, consented beta user.
  - Confirm “Ask about today” appears on the Daily Brief card.
  - Click it and confirm `/app/coach` opens with a contextual Nuraa response, not a blank chatbot.

- Explain My Score:
  - Confirm “Explain my score” appears on the Nuraa Score card.
  - Click it and verify the response explains existing score factors without recalculating the score.

- Follow-up conversation:
  - Type “What should I prioritise today?”
  - Confirm a user-visible message and validated Nuraa response appear.
  - Confirm a fresh context envelope is created for the turn.

- Disabled AI:
  - Set `AI_ENABLED=false`.
  - Confirm provider execution is skipped and a safe disabled/fallback state appears.

- Ineligible user:
  - Use an authenticated user not in `ai_internal_testers`.
  - Confirm `/app/coach` redirects to `/app/dashboard`.
  - Confirm dashboard Coach actions are hidden.

- Consent off:
  - Keep tester enabled but set `user_ai_preferences.ai_coaching_enabled=false`.
  - Confirm `/app/coach` shows “Enable Nuraa Coach”.
  - Confirm provider/context generation does not occur until consent is enabled.

- Provider timeout / invalid provider output:
  - Use fake/provider failure fixtures.
  - Confirm deterministic fallback renders and raw provider errors are not shown.

- S1 / S2 / S3 safety:
  - Ask a diagnosis/medication question, a worsening symptom question, and an emergency/self-harm question.
  - Confirm normal provider execution is suppressed.
  - Confirm approved safety copy appears.
  - Confirm raw S2/S3 crisis content is not stored as ordinary conversation history.

- Archived conversation:
  - Archive a conversation from Recent conversations.
  - Confirm it disappears from active context and is not used in later Coach context.

- Deleted conversation:
  - Delete a conversation.
  - Confirm it disappears from UI and is excluded from future context retrieval.

- Context refresh after check-in:
  - Save a new Daily Check-In.
  - Send a Coach follow-up.
  - Confirm the new turn builds fresh context from the latest deterministic signals.

## Privacy checks

- Browser output must not include prompts, model IDs, provider raw responses, raw context envelopes, service-role keys, OpenAI keys, or internal audit metadata.
- Coach content must remain separate from future durable memory systems.
- Disabling AI Coach must stop future provider use without affecting deterministic dashboard, progress, or reports.
