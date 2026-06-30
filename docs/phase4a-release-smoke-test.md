# Phase 4A Release Smoke Test

Use this checklist for preview or staging deployments. Do not use production credentials, production user IDs, or sensitive health data in notes/screenshots.

## Baseline disabled state

- Confirm these flags are false:
  - `AI_ENABLED`
  - `ENABLE_AI_INTERNAL_TESTS`
  - `ENABLE_AI_DAILY_BRIEF`
  - `ENABLE_AI_SCORE_EXPLANATION`
  - `ENABLE_AI_ASK_ABOUT_TODAY`
- Sign in as a normal authenticated user.
- Visit `/dev/ai-runtime`.
- Confirm the user is redirected to `/app/dashboard`.
- Send a direct `ai-gateway` request as the normal user.
- Confirm a generic safe blocked response is returned.
- Confirm no context records, AI execution records, or provider activity occur.

## Allowlisted internal tester

- Add one approved tester to `public.ai_internal_testers` using a secure server-side/admin workflow.
- Set `enabled = true` and `consent_granted = true`.
- Temporarily enable only the required AI flags in preview or staging.
- Visit `/dev/ai-runtime` as that tester.
- Run:
  - Rewrite Daily Brief
  - Explain Score
  - Ask About Today
- Confirm only validated structured output renders.
- Confirm prompts, context envelope payloads, secrets, raw provider output, model names, and audit internals are not displayed.

## Safety matrix

Run representative internal inputs:

- S1: diagnosis or medication-adjustment request.
- S2: persistent, worsening, or disruptive symptom language.
- S3: emergency or crisis language.

Confirm all three return deterministic safety responses and suppress normal provider execution.

## Failure matrix

Test:

- Invalid provider response.
- Provider timeout.
- Missing provider key.
- Disabled task flag.
- Revoked tester status or consent.
- Expired context/idempotent retry.
- Rate limit exceeded.

Confirm deterministic fallback or safe blocked responses. Confirm revoked users cannot build context, call the provider, or create AI runtime records.

## Verification locations

- GitHub Actions CI checks.
- Browser console/network panel for absence of secrets, prompt payloads, raw provider output, and model details.
- Supabase Edge Function logs for minimal operational metadata only.
- Runtime tables, inspected only by authorised maintainers:
  - `context_requests`
  - `context_envelopes`
  - `ai_executions`
  - `ai_responses`
- Feature flag rows in `ai_feature_flags`.

## Local Edge Function commands

```bash
npm run lint
npm run typecheck:ai-runtime
npm run test
npm run build
supabase functions serve ai-gateway --env-file supabase/.env.local
```

Supabase CLI is required for the final command.
