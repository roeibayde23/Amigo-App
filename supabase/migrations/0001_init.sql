-- Amigo – initial schema (run in Supabase SQL Editor or via `supabase db push`)
-- Every table: RLS ON + explicit GRANTs (Supabase no longer auto-grants new
-- public tables to anon/authenticated: default for new projects since 2026-05-30,
-- enforced on all projects from 2026-10-30).

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- tables ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  lang         text not null default 'he' check (lang in ('he','en')),
  dark_mode    boolean not null default false,
  timezone     text not null default 'Europe/Prague',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 300),
  done            boolean not null default false,          -- one-off tasks
  recur_freq      text check (recur_freq in ('daily','weekly','monthly')),
  recur_weekdays  smallint[] check (recur_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]), -- 0=Sun
  recur_month_day smallint check (recur_month_day between 1 and 31),
  last_done_on    date,                                    -- recurring: done for this occurrence
  source_gmail_id text,                                    -- "create task from mail"
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint tasks_recur_shape check (
       (recur_freq is null and recur_weekdays is null and recur_month_day is null)
    or (recur_freq = 'daily')
    or (recur_freq = 'weekly'  and coalesce(cardinality(recur_weekdays), 0) > 0)
    or (recur_freq = 'monthly' and recur_month_day is not null)
  )
);
create index tasks_user_created_idx on public.tasks (user_id, created_at desc);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  event_date  date not null,
  start_time  time,
  end_time    time,
  color       text not null default '#D96C5A'
              check (color in ('#D96C5A','#8B5CF6','#4FA3D1','#4CAF7D','#E0A93E','#D6699A')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint events_time_order check (start_time is null or end_time is null or end_time >= start_time)
);
create index events_user_date_idx on public.events (user_id, event_date, start_time);

-- Per-message UI state (gmail.readonly can't star/archive, so we keep it ourselves)
create table public.mail_state (
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  gmail_message_id text not null,
  important        boolean not null default false,
  hidden           boolean not null default false,
  updated_at       timestamptz not null default now(),
  primary key (user_id, gmail_message_id)
);

-- Google refresh token – SERVER ONLY (service_role). Value is AES-256-GCM
-- encrypted by the app with TOKEN_ENCRYPTION_KEY before insert.
create table public.google_tokens (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  google_email      text not null,
  refresh_token_enc text not null,
  scopes            text not null,
  obtained_at       timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger tasks_updated_at         before update on public.tasks         for each row execute function public.set_updated_at();
create trigger events_updated_at        before update on public.events        for each row execute function public.set_updated_at();
create trigger mail_state_updated_at    before update on public.mail_state    for each row execute function public.set_updated_at();
create trigger google_tokens_updated_at before update on public.google_tokens for each row execute function public.set_updated_at();

-- ---------- auto-create profile on sign-up ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'given_name',
                           new.raw_user_meta_data->>'full_name'));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.profiles      enable row level security;
alter table public.tasks         enable row level security;
alter table public.events        enable row level security;
alter table public.mail_state    enable row level security;
alter table public.google_tokens enable row level security;  -- no policies => no client access at all

-- profiles (key = id)
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- tasks
create policy tasks_select_own on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert_own on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update_own on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete_own on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);

-- events
create policy events_select_own on public.events for select to authenticated using ((select auth.uid()) = user_id);
create policy events_insert_own on public.events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy events_update_own on public.events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy events_delete_own on public.events for delete to authenticated using ((select auth.uid()) = user_id);

-- mail_state
create policy mail_state_select_own on public.mail_state for select to authenticated using ((select auth.uid()) = user_id);
create policy mail_state_insert_own on public.mail_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy mail_state_update_own on public.mail_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy mail_state_delete_own on public.mail_state for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- explicit GRANTs ----------
-- Start from zero (harmless on new projects, removes legacy auto-grants on old ones)
revoke all on public.profiles, public.tasks, public.events, public.mail_state, public.google_tokens
  from anon, authenticated;

-- signed-in users (RLS still filters to their own rows)
grant select, insert, update         on public.profiles                        to authenticated;
grant select, insert, update, delete on public.tasks, public.events, public.mail_state to authenticated;

-- server code using the secret / service_role key
grant select, insert, update, delete
  on public.profiles, public.tasks, public.events, public.mail_state, public.google_tokens
  to service_role;

-- anon: intentionally NO grants. google_tokens: intentionally NO grant to authenticated.
