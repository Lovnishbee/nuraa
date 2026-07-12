# Phase V-B Proactive Cards Smoke Test

Phase V-B is private-beta only. It converts approved deterministic Phase V-A `insight_candidates` into dashboard guidance cards.

## Access model

Cards require:

- authenticated user
- `ai_internal_testers.enabled = true`
- `ai_internal_testers.consent_granted = true`
- `user_ai_preferences.ai_coaching_enabled = true`
- `ENABLE_PROACTIVE_INTELLIGENCE = true`
- `ENABLE_AI_CARDS = true`

If any check fails, the normal dashboard remains unchanged.

## Local commands

```bash
npm run lint
npm run test
npm run typecheck:ai-runtime
npm run build
```

If Supabase CLI is available:

```bash
supabase functions serve proactive-cards --env-file supabase/.env.local
```

## Manual checks

1. Enable the private-beta user and required flags.
2. Run `/dev/proactive-intelligence` and generate Phase V-A candidates.
3. Open `/app/dashboard`.
4. Confirm `Today’s guidance` appears only when cards are available.
5. Confirm dismiss removes a card.
6. Confirm snooze hides a card.
7. Confirm helpful/not helpful/show-less feedback saves without exposing raw context.
8. Confirm Ask Coach is visible only for Coach-eligible users.
9. Confirm a non-tester sees no card section and no visible error.

## Out of scope

Phase V-B does not add weekly reflections, notifications, public rollout, wearable integrations, health report analysis, or provider-managed memory.
