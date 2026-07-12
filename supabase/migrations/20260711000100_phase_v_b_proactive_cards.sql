-- Nuraa Phase V-B: private-beta proactive guidance cards.
-- Cards are created server-side from approved Phase V-A insight candidates.
-- Browser clients can read their own cards and submit bounded feedback, but
-- cannot create or alter card content/evidence.

create table if not exists public.proactive_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null references public.insight_candidates(id) on delete cascade,

  health_date date not null,
  card_type text not null check (card_type in ('observation', 'opportunity', 'attention', 'celebration', 'data_gap')),
  category text not null check (category in ('sleep', 'stress', 'recovery', 'energy', 'activity', 'nutrition', 'hydration', 'mood', 'consistency', 'goal_progress', 'readiness', 'data_gap', 'weekly_pattern', 'coach_followup')),
  severity text not null check (severity in ('low', 'medium', 'high')),

  title text not null,
  body text not null,
  primary_action_label text,
  primary_action_type text,
  primary_action_payload jsonb not null default '{}'::jsonb,

  evidence_refs jsonb not null default '[]'::jsonb,
  confidence_score integer check (confidence_score between 0 and 100),
  confidence_label text check (confidence_label in ('high', 'moderate', 'low', 'insufficient')),

  status text not null default 'active' check (status in ('active', 'shown', 'dismissed', 'snoozed', 'expired', 'archived')),
  source_engine_version text not null,
  copy_source text not null default 'deterministic' check (copy_source in ('deterministic', 'ai_rewrite')),

  shown_at timestamptz,
  dismissed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, candidate_id)
);

create table if not exists public.proactive_card_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id uuid not null references public.proactive_cards(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('helpful', 'not_helpful', 'not_relevant', 'too_frequent', 'show_less_like_this')),
  feedback_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.proactive_card_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id uuid not null references public.proactive_cards(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'shown', 'opened', 'dismissed', 'snoozed', 'feedback_submitted', 'coach_handoff_started')),
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists proactive_cards_user_health_date_idx
  on public.proactive_cards(user_id, health_date desc);
create index if not exists proactive_cards_user_status_idx
  on public.proactive_cards(user_id, status, created_at desc);
create index if not exists proactive_cards_user_category_idx
  on public.proactive_cards(user_id, category, created_at desc);
create index if not exists proactive_card_feedback_user_card_idx
  on public.proactive_card_feedback(user_id, card_id, created_at desc);
create index if not exists proactive_card_events_user_card_idx
  on public.proactive_card_events(user_id, card_id, created_at desc);

drop trigger if exists proactive_cards_set_updated_at on public.proactive_cards;
create trigger proactive_cards_set_updated_at before update on public.proactive_cards for each row execute function public.set_updated_at();

alter table public.proactive_cards enable row level security;
alter table public.proactive_card_feedback enable row level security;
alter table public.proactive_card_events enable row level security;

revoke all on public.proactive_cards from anon, authenticated;
revoke all on public.proactive_card_feedback from anon, authenticated;
revoke all on public.proactive_card_events from anon, authenticated;

grant select on public.proactive_cards to authenticated;
grant select, insert on public.proactive_card_feedback to authenticated;
grant select on public.proactive_card_events to authenticated;

grant select, insert, update, delete on public.proactive_cards to service_role;
grant select, insert, update, delete on public.proactive_card_feedback to service_role;
grant select, insert, update, delete on public.proactive_card_events to service_role;

drop policy if exists "Users can read their proactive cards" on public.proactive_cards;
create policy "Users can read their proactive cards"
  on public.proactive_cards for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their proactive card feedback" on public.proactive_card_feedback;
create policy "Users can read their proactive card feedback"
  on public.proactive_card_feedback for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert bounded proactive card feedback" on public.proactive_card_feedback;
create policy "Users can insert bounded proactive card feedback"
  on public.proactive_card_feedback for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.proactive_cards card
      where card.id = card_id
        and card.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read their proactive card events" on public.proactive_card_events;
create policy "Users can read their proactive card events"
  on public.proactive_card_events for select to authenticated
  using ((select auth.uid()) = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('proactive_cards', 'proactive_card_feedback', 'proactive_card_events')
      and c.relrowsecurity = true
    group by n.nspname
    having count(*) = 3
  ) then
    raise exception 'Phase V-B failed: RLS is not enabled on all proactive card tables';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'proactive_cards'
      and roles::text like '%authenticated%'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Phase V-B failed: authenticated write policy exists on proactive_cards';
  end if;

  if has_table_privilege('authenticated', 'public.proactive_cards', 'INSERT')
    or has_table_privilege('authenticated', 'public.proactive_cards', 'UPDATE')
    or has_table_privilege('authenticated', 'public.proactive_cards', 'DELETE') then
    raise exception 'Phase V-B failed: authenticated role has direct write privileges on proactive_cards';
  end if;
end $$;
