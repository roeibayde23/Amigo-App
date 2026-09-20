-- Filey MVP schema: one row per file placed on a user's visual canvas.

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  storage_path text not null,
  pos_x double precision not null default 24,
  pos_y double precision not null default 24,
  width double precision not null default 160,
  height double precision not null default 160,
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists files_owner_id_idx on public.files (owner_id);

-- Keep updated_at current on every layout/metadata change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists files_set_updated_at on public.files;
create trigger files_set_updated_at
  before update on public.files
  for each row
  execute function public.set_updated_at();

alter table public.files enable row level security;

drop policy if exists "Files are visible to their owner" on public.files;
create policy "Files are visible to their owner"
  on public.files for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners can insert their own files" on public.files;
create policy "Owners can insert their own files"
  on public.files for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their own files" on public.files;
create policy "Owners can update their own files"
  on public.files for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete their own files" on public.files;
create policy "Owners can delete their own files"
  on public.files for delete
  using (auth.uid() = owner_id);

-- Storage bucket for the raw uploaded file bytes. Files are private; the app
-- reads them via short-lived signed URLs, keyed by path convention
-- `${auth.uid()}/${file_id}-${original_name}` so RLS can check the owner
-- from the path itself.
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

drop policy if exists "Owners can read their own storage objects" on storage.objects;
create policy "Owners can read their own storage objects"
  on storage.objects for select
  using (bucket_id = 'files' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Owners can upload to their own storage folder" on storage.objects;
create policy "Owners can upload to their own storage folder"
  on storage.objects for insert
  with check (bucket_id = 'files' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Owners can delete their own storage objects" on storage.objects;
create policy "Owners can delete their own storage objects"
  on storage.objects for delete
  using (bucket_id = 'files' and auth.uid()::text = (storage.foldername(name))[1]);
