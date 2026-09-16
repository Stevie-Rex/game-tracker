-- Games table
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  platform text not null,
  genres text[] not null default '{}',
  cover_url text,
  status text not null default 'backlog' check (status in ('backlog', 'playing', 'completed', 'dropped')),
  igdb_id bigint,
  time_to_beat_main numeric,
  time_to_beat_extra numeric,
  time_to_beat_completionist numeric,
  rating numeric(2, 1) check (rating is null or (rating >= 0 and rating <= 5)),
  review text,
  backlog_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_owner_id_idx on public.games (owner_id);
create index if not exists games_owner_status_idx on public.games (owner_id, status);

-- Session log entries
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  session_date date not null default current_date,
  duration_minutes integer not null check (duration_minutes >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists sessions_game_id_idx on public.sessions (game_id);
create index if not exists sessions_owner_id_idx on public.sessions (owner_id);

-- Keep updated_at current on games
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
  before update on public.games
  for each row
  execute function public.set_updated_at();

-- Row Level Security: every user only ever sees/edits their own rows
alter table public.games enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "games_select_own" on public.games;
create policy "games_select_own" on public.games
  for select using (owner_id = auth.uid());

drop policy if exists "games_insert_own" on public.games;
create policy "games_insert_own" on public.games
  for insert with check (owner_id = auth.uid());

drop policy if exists "games_update_own" on public.games;
create policy "games_update_own" on public.games
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "games_delete_own" on public.games;
create policy "games_delete_own" on public.games
  for delete using (owner_id = auth.uid());

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select using (owner_id = auth.uid());

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert with check (owner_id = auth.uid());

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own" on public.sessions
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own" on public.sessions
  for delete using (owner_id = auth.uid());
