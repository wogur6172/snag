-- Snag social boards schema for Supabase.
-- Run this in the Supabase SQL editor after creating a project.
-- This keeps personal collections local. Only shared social boards use cloud tables.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  title text not null check (char_length(title) between 1 and 32),
  color text not null default '#FFD6D6',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table if not exists public.board_member_bans (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table if not exists public.board_reports (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete set null,
  type text not null default 'member' check (type in ('member', 'board', 'snag')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.board_snags (
  board_id uuid not null references public.boards(id) on delete cascade,
  id text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  image_path text,
  kind text not null default 'image' check (kind in ('image', 'text')),
  text_value text,
  canvas_x double precision not null,
  canvas_y double precision not null,
  size double precision not null check (size > 0),
  rotate text not null default '0deg',
  layer_index integer not null default 0,
  image_width double precision,
  image_height double precision,
  title text not null default 'Snag',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_snags_kind_payload_check check (
    (kind = 'image' and image_path is not null)
    or (
      kind = 'text'
      and text_value is not null
      and char_length(text_value) between 1 and 42
    )
  ),
  primary key (board_id, id)
);

create table if not exists public.board_drawings (
  board_id uuid not null references public.boards(id) on delete cascade,
  id text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  color text not null,
  width double precision not null check (width > 0),
  points jsonb not null,
  layer_index integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (board_id, id)
);

create index if not exists board_members_user_id_idx on public.board_members(user_id);
create index if not exists board_members_board_id_idx on public.board_members(board_id);
create index if not exists board_member_bans_user_id_idx on public.board_member_bans(user_id);
create index if not exists board_member_bans_board_id_idx on public.board_member_bans(board_id);
create index if not exists board_reports_board_id_idx on public.board_reports(board_id);
create index if not exists board_reports_reporter_id_idx on public.board_reports(reporter_id);
create index if not exists boards_owner_id_idx on public.boards(owner_id);
create index if not exists board_snags_owner_id_idx on public.board_snags(owner_id);
create index if not exists board_drawings_owner_id_idx on public.board_drawings(owner_id);
create index if not exists board_snags_board_layer_idx on public.board_snags(board_id, layer_index);
create index if not exists board_drawings_board_layer_idx on public.board_drawings(board_id, layer_index);

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.board_member_bans enable row level security;
alter table public.board_reports enable row level security;
alter table public.board_snags enable row level security;
alter table public.board_drawings enable row level security;

create or replace function private.is_board_member(target_board_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.board_members
    where board_members.board_id = target_board_id
      and board_members.user_id = target_user_id
  );
$$;

create or replace function private.is_board_owner(target_board_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boards
    where boards.id = target_board_id
      and boards.owner_id = target_user_id
  );
$$;

create or replace function private.get_user_created_board_count(target_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.boards
  where boards.owner_id = target_user_id;
$$;

create or replace function private.get_user_joined_board_count(target_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.board_members
  where board_members.user_id = target_user_id;
$$;

create or replace function private.get_board_member_count(target_board_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.board_members
  where board_members.board_id = target_board_id;
$$;

create or replace function private.get_board_snag_count(target_board_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.board_snags
  where board_snags.board_id = target_board_id;
$$;

revoke all on function private.is_board_member(uuid, uuid) from public;
revoke all on function private.is_board_owner(uuid, uuid) from public;
revoke all on function private.get_user_created_board_count(uuid) from public;
revoke all on function private.get_user_joined_board_count(uuid) from public;
revoke all on function private.get_board_member_count(uuid) from public;
revoke all on function private.get_board_snag_count(uuid) from public;
grant execute on function private.is_board_member(uuid, uuid) to authenticated;
grant execute on function private.is_board_owner(uuid, uuid) to authenticated;
grant execute on function private.get_user_created_board_count(uuid) to authenticated;
grant execute on function private.get_user_joined_board_count(uuid) to authenticated;
grant execute on function private.get_board_member_count(uuid) to authenticated;
grant execute on function private.get_board_snag_count(uuid) to authenticated;
grant usage on schema private to authenticated;

create or replace function public.join_board_by_code(invite_code text)
returns table (
  id uuid,
  code text,
  title text,
  color text,
  owner_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text := upper(left(regexp_replace(coalesce(invite_code, ''), '[^A-Za-z0-9]', '', 'g'), 6));
  target_board public.boards%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into target_board
  from public.boards
  where boards.code = normalized_code
    and not exists (
      select 1
      from public.board_member_bans
      where board_member_bans.board_id = boards.id
        and board_member_bans.user_id = current_user_id
    )
  limit 1;

  if not found then
    return;
  end if;

  if private.get_user_joined_board_count(current_user_id) >= 3
    and not private.is_board_member(target_board.id, current_user_id) then
    return;
  end if;

  if private.get_board_member_count(target_board.id) >= 8
    and not private.is_board_member(target_board.id, current_user_id) then
    return;
  end if;

  insert into public.board_members(board_id, user_id, role, joined_at)
  values (
    target_board.id,
    current_user_id,
    case when target_board.owner_id = current_user_id then 'owner' else 'member' end,
    now()
  )
  on conflict (board_id, user_id)
  do update set joined_at = public.board_members.joined_at;

  return query
  select
    target_board.id,
    target_board.code,
    target_board.title,
    target_board.color,
    target_board.owner_id,
    target_board.created_at,
    target_board.updated_at;
end;
$$;

revoke all on function public.join_board_by_code(text) from public;
revoke all on function public.join_board_by_code(text) from anon;
grant execute on function public.join_board_by_code(text) to authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.boards to authenticated;
grant select, insert, update, delete on public.board_members to authenticated;
grant select, insert, delete on public.board_member_bans to authenticated;
grant select, insert on public.board_reports to authenticated;
grant select, insert, update, delete on public.board_snags to authenticated;
grant select, insert, update, delete on public.board_drawings to authenticated;

create policy "profiles_select_self_or_shared_board_members"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.board_members mine
    join public.board_members theirs on theirs.board_id = mine.board_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = profiles.id
  )
);

create policy "profiles_insert_self"
on public.profiles for insert
to authenticated
with check (id = (select auth.uid()));

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "boards_select_members"
on public.boards for select
to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_board_member(boards.id, (select auth.uid()))
);

create policy "boards_insert_owner"
on public.boards for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and private.get_user_created_board_count((select auth.uid())) < 2
  and private.get_user_joined_board_count((select auth.uid())) < 3
);

create policy "boards_update_owner"
on public.boards for update
to authenticated
using (owner_id = (select auth.uid()))
with check (private.is_board_member(boards.id, boards.owner_id));

create policy "boards_delete_owner"
on public.boards for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "board_members_select_joined_boards"
on public.board_members for select
to authenticated
using (
  private.is_board_member(board_members.board_id, (select auth.uid()))
);

create policy "board_members_insert_self"
on public.board_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.get_user_joined_board_count((select auth.uid())) < 3
  and private.get_board_member_count(board_members.board_id) < 8
);

create policy "board_members_update_owner"
on public.board_members for update
to authenticated
using (
  private.is_board_owner(board_members.board_id, (select auth.uid()))
)
with check (
  private.is_board_owner(board_members.board_id, (select auth.uid()))
);

create policy "board_members_delete_self_or_owner"
on public.board_members for delete
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_board_owner(board_members.board_id, (select auth.uid()))
);

create policy "board_member_bans_owner_manage"
on public.board_member_bans for all
to authenticated
using (
  private.is_board_owner(board_member_bans.board_id, (select auth.uid()))
)
with check (
  created_by = (select auth.uid())
  and private.is_board_owner(board_member_bans.board_id, (select auth.uid()))
);

create policy "board_reports_select_own"
on public.board_reports for select
to authenticated
using (
  reporter_id = (select auth.uid())
);

create policy "board_reports_insert_member"
on public.board_reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and private.is_board_member(board_reports.board_id, (select auth.uid()))
);

create policy "board_snags_select_members"
on public.board_snags for select
to authenticated
using (
  private.is_board_member(board_snags.board_id, (select auth.uid()))
);

create policy "board_snags_insert_members"
on public.board_snags for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and private.is_board_member(board_snags.board_id, (select auth.uid()))
  and private.get_board_snag_count(board_snags.board_id) < 60
);

create policy "board_snags_update_members"
on public.board_snags for update
to authenticated
using (
  private.is_board_member(board_snags.board_id, (select auth.uid()))
)
with check (
  private.is_board_member(board_snags.board_id, (select auth.uid()))
);

create policy "board_snags_delete_members"
on public.board_snags for delete
to authenticated
using (
  private.is_board_member(board_snags.board_id, (select auth.uid()))
);

create policy "board_drawings_select_members"
on public.board_drawings for select
to authenticated
using (
  private.is_board_member(board_drawings.board_id, (select auth.uid()))
);

create policy "board_drawings_insert_members"
on public.board_drawings for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and private.is_board_member(board_drawings.board_id, (select auth.uid()))
);

create policy "board_drawings_delete_members"
on public.board_drawings for delete
to authenticated
using (
  private.is_board_member(board_drawings.board_id, (select auth.uid()))
);

insert into storage.buckets (id, name, public)
values ('board-snags', 'board-snags', false)
on conflict (id) do update set public = false;

-- This creates a private Storage bucket named "board-snags".
-- The app asks Supabase for short-lived signed URLs when board members load a room.
-- Supabase owns the storage.objects table.

create policy "board_snag_files_select_members"
on storage.objects for select
to authenticated
using (
  bucket_id = 'board-snags'
  and private.is_board_member(split_part(storage.objects.name, '/', 1)::uuid, (select auth.uid()))
);

create policy "board_snag_files_insert_members"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'board-snags'
  and private.is_board_member(split_part(storage.objects.name, '/', 1)::uuid, (select auth.uid()))
);

create policy "board_snag_files_update_members"
on storage.objects for update
to authenticated
using (
  bucket_id = 'board-snags'
  and private.is_board_member(split_part(storage.objects.name, '/', 1)::uuid, (select auth.uid()))
)
with check (
  bucket_id = 'board-snags'
  and private.is_board_member(split_part(storage.objects.name, '/', 1)::uuid, (select auth.uid()))
);

create policy "board_snag_files_delete_members"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'board-snags'
  and private.is_board_member(split_part(storage.objects.name, '/', 1)::uuid, (select auth.uid()))
);
