-- Nuraa Phase 4A hardening: expose only the current user's internal AI access
-- status to authenticated browser clients. Runtime/config writes remain server-only.

alter table public.ai_internal_testers enable row level security;

revoke all on public.ai_internal_testers from anon;
revoke insert, update, delete on public.ai_internal_testers from authenticated;
grant select on public.ai_internal_testers to authenticated;
grant select, insert, update, delete on public.ai_internal_testers to service_role;

drop policy if exists "Users can read their own AI internal access status" on public.ai_internal_testers;
create policy "Users can read their own AI internal access status"
  on public.ai_internal_testers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

do $$
declare
  rls_enabled boolean;
  self_read_policy_count integer;
  authenticated_write_policy_count integer;
begin
  select c.relrowsecurity into rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'ai_internal_testers';

  if rls_enabled is distinct from true then
    raise exception 'Phase 4A hardening failed: ai_internal_testers RLS is not enabled';
  end if;

  select count(*) into self_read_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'ai_internal_testers'
    and policyname = 'Users can read their own AI internal access status'
    and cmd = 'SELECT'
    and 'authenticated'::name = any(roles);

  if self_read_policy_count <> 1 then
    raise exception 'Phase 4A hardening failed: ai_internal_testers self-read policy missing';
  end if;

  select count(*) into authenticated_write_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'ai_internal_testers'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and 'authenticated'::name = any(roles);

  if authenticated_write_policy_count <> 0 then
    raise exception 'Phase 4A hardening failed: authenticated write policy exists on ai_internal_testers';
  end if;

  if not has_table_privilege('authenticated', 'public.ai_internal_testers', 'SELECT') then
    raise exception 'Phase 4A hardening failed: authenticated role cannot select ai_internal_testers';
  end if;

  if has_table_privilege('authenticated', 'public.ai_internal_testers', 'INSERT')
    or has_table_privilege('authenticated', 'public.ai_internal_testers', 'UPDATE')
    or has_table_privilege('authenticated', 'public.ai_internal_testers', 'DELETE') then
    raise exception 'Phase 4A hardening failed: authenticated role has write privileges on ai_internal_testers';
  end if;
end $$;
