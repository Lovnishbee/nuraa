# Phase V-D Evaluation Metrics SQL

Use these read-only queries in the Supabase SQL Editor after testing with the private beta user.

Test user:

```sql
-- Private beta test user
select 'c01aaab7-0af5-4d5c-acd9-d136cbe6e6cf'::uuid as test_user_id;
```

## Product metrics

```sql
with beta_user as (
  select 'c01aaab7-0af5-4d5c-acd9-d136cbe6e6cf'::uuid as user_id
),
card_events as (
  select event_type, count(*)::integer as count
  from public.proactive_card_events
  where user_id = (select user_id from beta_user)
  group by event_type
),
card_feedback as (
  select feedback_type, count(*)::integer as count
  from public.proactive_card_feedback
  where user_id = (select user_id from beta_user)
  group by feedback_type
),
weekly as (
  select
    count(*) filter (where viewed_at is not null)::integer as weekly_reflections_viewed,
    count(*) filter (where dismissed_at is not null)::integer as weekly_reflections_dismissed
  from public.weekly_reflections
  where user_id = (select user_id from beta_user)
)
select *
from (
  values
    ('cards_shown', coalesce((select count from card_events where event_type = 'shown'), 0)),
    ('cards_viewed', coalesce((select count from card_events where event_type = 'opened'), 0)),
    ('cards_dismissed', coalesce((select count from card_events where event_type = 'dismissed'), 0)),
    ('cards_marked_helpful', coalesce((select count from card_feedback where feedback_type = 'helpful'), 0)),
    ('cards_marked_not_helpful', coalesce((select count from card_feedback where feedback_type = 'not_helpful'), 0)),
    ('show_less_like_this_count', coalesce((select count from card_feedback where feedback_type = 'show_less_like_this'), 0)),
    ('coach_continuations_from_card', coalesce((select count from card_events where event_type = 'coach_handoff_started'), 0)),
    ('weekly_reflections_viewed', (select weekly_reflections_viewed from weekly)),
    ('weekly_reflections_dismissed', (select weekly_reflections_dismissed from weekly))
) as metrics(metric_name, metric_value)
order by metric_name;
```

## Quality metrics

```sql
with beta_user as (
  select 'c01aaab7-0af5-4d5c-acd9-d136cbe6e6cf'::uuid as user_id
),
cards as (
  select *
  from public.proactive_cards
  where user_id = (select user_id from beta_user)
),
candidates as (
  select *
  from public.insight_candidates
  where user_id = (select user_id from beta_user)
),
executions as (
  select *
  from public.ai_executions
  where user_id = (select user_id from beta_user)
)
select *
from (
  select
    'repetition_rate' as metric_name,
    coalesce(
      round(
        (
          count(*) filter (
            where exists (
              select 1
              from cards previous
              where previous.user_id = cards.user_id
                and previous.category = cards.category
                and previous.id <> cards.id
                and previous.created_at >= cards.created_at - interval '72 hours'
                and previous.created_at < cards.created_at
            )
          )::numeric / nullif(count(*), 0)
        ),
        4
      ),
      0
    ) as metric_value
  from cards
  union all
  select
    'fallback_rate',
    coalesce(round((count(*) filter (where status = 'fallback'))::numeric / nullif(count(*), 0), 4), 0)
  from executions
  union all
  select
    'safety_rejection_rate',
    coalesce(round((count(*) filter (where status = 'safety_routed'))::numeric / nullif(count(*), 0), 4), 0)
  from executions
  union all
  select
    'low_confidence_card_rate',
    coalesce(round((count(*) filter (where confidence_label = 'low' or coalesce(confidence_score, 0) < 60))::numeric / nullif(count(*), 0), 4), 0)
  from cards
  union all
  select
    'attention_card_rate',
    coalesce(round((count(*) filter (where card_type = 'attention'))::numeric / nullif(count(*), 0), 4), 0)
  from cards
  union all
  select
    'unsupported_claim_candidate_count',
    count(*)::numeric
  from candidates
  where evidence_json is null
     or jsonb_array_length(coalesce(evidence_json->'evidence', '[]'::jsonb)) = 0
) as metrics(metric_name, metric_value)
order by metric_name;
```

## Safety and privacy verification

These checks should return zero rows.

```sql
with beta_user as (
  select 'c01aaab7-0af5-4d5c-acd9-d136cbe6e6cf'::uuid as user_id
),
unsafe_text as (
  select 'proactive_cards' as source, id::text, concat_ws(' ', title, body, primary_action_label, primary_action_payload::text, evidence_refs::text) as text_value
  from public.proactive_cards
  where user_id = (select user_id from beta_user)
  union all
  select 'weekly_reflections' as source, id::text, concat_ws(' ', summary_payload::text, source_references::text) as text_value
  from public.weekly_reflections
  where user_id = (select user_id from beta_user)
)
select source, id, text_value
from unsafe_text
where text_value ~* '(openai|api[_ -]?key|service[_ -]?role|prompt|raw context|diagnose|diagnosis|prescribe|medication|medicine dosage|stop taking|start taking)';
```

## Expected beta-readiness thresholds

- `fallback_rate`: acceptable during fake-provider testing; investigate if unexpectedly high with live provider.
- `safety_rejection_rate`: non-zero only when safety test prompts were run.
- `low_confidence_card_rate`: should stay low; cards below confidence thresholds should generally be suppressed.
- `unsupported_claim_candidate_count`: must be `0`.
- Safety/privacy verification: must return `0` rows.
