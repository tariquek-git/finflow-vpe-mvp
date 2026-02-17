-- FinFlow MVP cloud workspace bootstrap.
-- Run with Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Diagram',
  graph jsonb not null default jsonb_build_object(
    'schemaVersion', 4,
    'nodes', jsonb_build_array(),
    'edges', jsonb_build_array(),
    'drawings', jsonb_build_array()
  ),
  layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_owner_updated_idx
  on public.workspaces (owner_id, updated_at desc);

drop trigger if exists trg_workspaces_set_updated_at on public.workspaces;
create trigger trg_workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create table if not exists public.workspace_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists workspace_versions_workspace_created_idx
  on public.workspace_versions (workspace_id, created_at desc);

alter table public.workspaces enable row level security;
alter table public.workspace_versions enable row level security;

drop policy if exists "workspaces_select_own" on public.workspaces;
create policy "workspaces_select_own"
  on public.workspaces
  for select
  using (auth.uid() = owner_id);

drop policy if exists "workspaces_insert_own" on public.workspaces;
create policy "workspaces_insert_own"
  on public.workspaces
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "workspaces_update_own" on public.workspaces;
create policy "workspaces_update_own"
  on public.workspaces
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "workspaces_delete_own" on public.workspaces;
create policy "workspaces_delete_own"
  on public.workspaces
  for delete
  using (auth.uid() = owner_id);

drop policy if exists "workspace_versions_select_own" on public.workspace_versions;
create policy "workspace_versions_select_own"
  on public.workspace_versions
  for select
  using (auth.uid() = owner_id);

drop policy if exists "workspace_versions_insert_own" on public.workspace_versions;
create policy "workspace_versions_insert_own"
  on public.workspace_versions
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "workspace_versions_delete_own" on public.workspace_versions;
create policy "workspace_versions_delete_own"
  on public.workspace_versions
  for delete
  using (auth.uid() = owner_id);
