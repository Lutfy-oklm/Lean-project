create table if not exists public.pilotprocess_projects (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.pilotprocess_projects enable row level security;

drop policy if exists "pilotprocess public read" on public.pilotprocess_projects;
drop policy if exists "pilotprocess public insert" on public.pilotprocess_projects;
drop policy if exists "pilotprocess public update" on public.pilotprocess_projects;
drop policy if exists "pilotprocess public delete" on public.pilotprocess_projects;

create policy "pilotprocess public read"
on public.pilotprocess_projects
for select
to anon
using (true);

create policy "pilotprocess public insert"
on public.pilotprocess_projects
for insert
to anon
with check (true);

create policy "pilotprocess public update"
on public.pilotprocess_projects
for update
to anon
using (true)
with check (true);

create policy "pilotprocess public delete"
on public.pilotprocess_projects
for delete
to anon
using (true);
