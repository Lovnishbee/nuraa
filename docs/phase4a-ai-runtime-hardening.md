# Nuraa Phase 4A AI Runtime Hardening

Phase 4A is internal-only. It does not expose a public AI Coach, dashboard AI entry point, streaming UI, conversation persistence, or AI-driven writes. Deterministic Phase 3 intelligence remains the source of truth.

Phase 4B adds a private-beta Coach on the same server-authoritative runtime. It remains allowlisted and disabled by default; Phase 4A `/dev/ai-runtime` behavior remains internal-dev only.

## Internal tester model

- `public.ai_internal_testers` is the canonical allowlist.
- A user must have `enabled = true` and `consent_granted = true`.
- Browser clients can read only their own access status through RLS.
- Browser clients cannot insert, update, or delete tester records.
- Tester management must happen through a secure server-side/admin workflow using service-role credentials outside the repo.

The client guard is only for user experience. The Supabase Edge Function is the authority and independently blocks non-testers, missing consent, disabled flags, and future entry points.

## Required flags

All AI flags default to disabled:

```text
AI_ENABLED=false
ENABLE_AI_INTERNAL_TESTS=false
ENABLE_AI_DAILY_BRIEF=false
ENABLE_AI_SCORE_EXPLANATION=false
ENABLE_AI_ASK_ABOUT_TODAY=false
ENABLE_AI_COACH=false
ENABLE_AI_COACH_DASHBOARD_ENTRY=false
ENABLE_AI_COACH_HISTORY=false
ENABLE_AI_COACH_FEEDBACK=false
AI_INTERNAL_ACCESS_REQUIRED=true
```

For preview/staging internal tests, enable only the minimum flags needed for the task being tested. Do not expose model aliases, prompt contracts, provider config, context envelopes, or secrets in browser code.

## Local verification

Run:

```bash
npm run lint
npm run typecheck:ai-runtime
npm run test
npm run build
```

Supabase CLI checks, when the CLI is installed:

```bash
supabase migration list --local
supabase functions serve ai-gateway --env-file supabase/.env.local
```

`supabase/.env.local` must contain local-only secrets such as `SUPABASE_SERVICE_ROLE_KEY` and, only when testing the real provider, `OPENAI_API_KEY`. Do not commit that file.

## CI

GitHub Actions runs on `push` and `pull_request`.

The workflow uses Node.js 22 and runs:

```bash
npm ci
npm run lint
npm run typecheck:ai-runtime
npm run test
npm run build
```

CI sets AI env values to disabled/fake defaults. Tests must not require OpenAI credentials or make real OpenAI network calls.

## FakeAIProvider

Automated tests should use `FakeAIProvider` or explicit mocked providers. Real provider checks belong in controlled preview/staging smoke tests only.

## Safety and privacy boundaries

- S1/S2/S3 safety routes suppress normal provider execution.
- Provider/config/validation failures return deterministic fallback payloads.
- Raw check-in reflections, prompt text, context envelopes, raw provider responses, secrets, and model names are not shown in the UI.
- Context reads are built from scoped Phase 3 records for the authenticated user only.
- Phase 4B Coach conversations are Nuraa-owned records, not provider-managed conversation state.
- Phase 4B does not diagnose, prescribe, create durable memory, or use OpenAI `previous_response_id`.
