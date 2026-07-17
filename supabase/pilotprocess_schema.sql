create table if not exists public.pilotprocess_projects (
  id text primary key,
  owner_id uuid,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.pilotprocess_projects
add column if not exists owner_id uuid;

alter table public.pilotprocess_projects
alter column owner_id set default auth.uid();

alter table public.pilotprocess_projects enable row level security;

drop policy if exists "pilotprocess public read" on public.pilotprocess_projects;
drop policy if exists "pilotprocess public insert" on public.pilotprocess_projects;
drop policy if exists "pilotprocess public update" on public.pilotprocess_projects;
drop policy if exists "pilotprocess public delete" on public.pilotprocess_projects;
drop policy if exists "pilotprocess user read" on public.pilotprocess_projects;
drop policy if exists "pilotprocess user insert" on public.pilotprocess_projects;
drop policy if exists "pilotprocess user update" on public.pilotprocess_projects;
drop policy if exists "pilotprocess user delete" on public.pilotprocess_projects;

create policy "pilotprocess user read"
on public.pilotprocess_projects
for select
to authenticated
using (owner_id = auth.uid() or owner_id is null);

create policy "pilotprocess user insert"
on public.pilotprocess_projects
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "pilotprocess user update"
on public.pilotprocess_projects
for update
to authenticated
using (owner_id = auth.uid() or owner_id is null)
with check (owner_id = auth.uid());

create policy "pilotprocess user delete"
on public.pilotprocess_projects
for delete
to authenticated
using (owner_id = auth.uid());
