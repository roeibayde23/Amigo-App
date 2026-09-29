-- Amigo 0002 – task due date/time + per-sender mail importance.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- (The app keeps working without it: due dates are then not stored in Supabase and
--  sender answers are remembered in the browser only.)

-- 1) Tasks: optional due date + time (sent to iPhone Reminders as the alert time)
alter table public.tasks add column if not exists due_date date;
alter table public.tasks add column if not exists due_time time;

-- 2) "Is mail from this sender important?" answers ("זה חשוב?" yes/no), remembered per sender
create table if not exists public.mail_sender_prefs (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender_email text not null check (char_length(sender_email) between 3 and 320),
  important    boolean not null,
  updated_at   timestamptz not null default now(),
  primary key (user_id, sender_email)
);

drop trigger if exists mail_sender_prefs_updated_at on public.mail_sender_prefs;
create trigger mail_sender_prefs_updated_at before update on public.mail_sender_prefs
  for each row execute function public.set_updated_at();

alter table public.mail_sender_prefs enable row level security;

drop policy if exists mail_sender_prefs_select_own on public.mail_sender_prefs;
drop policy if exists mail_sender_prefs_insert_own on public.mail_sender_prefs;
drop policy if exists mail_sender_prefs_update_own on public.mail_sender_prefs;
drop policy if exists mail_sender_prefs_delete_own on public.mail_sender_prefs;
create policy mail_sender_prefs_select_own on public.mail_sender_prefs for select to authenticated using ((select auth.uid()) = user_id);
create policy mail_sender_prefs_insert_own on public.mail_sender_prefs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy mail_sender_prefs_update_own on public.mail_sender_prefs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy mail_sender_prefs_delete_own on public.mail_sender_prefs for delete to authenticated using ((select auth.uid()) = user_id);

-- Explicit grants (Supabase no longer auto-exposes new public tables)
revoke all on public.mail_sender_prefs from anon, authenticated;
grant select, insert, update, delete on public.mail_sender_prefs to authenticated;
grant select, insert, update, delete on public.mail_sender_prefs to service_role;
