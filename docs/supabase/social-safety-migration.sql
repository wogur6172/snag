-- Snag social safety and Free limits migration.
-- Run this in Supabase SQL editor if you already applied social-schema.sql before
-- board member kick / owner transfer / Free limits support was added.

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

create index if not exists board_member_bans_user_id_idx on public.board_member_bans(user_id);
create index if not exists board_member_bans_board_id_idx on public.board_member_bans(board_id);
create index if not exists board_reports_board_id_idx on public.board_reports(board_id);
create index if not exists board_reports_reporter_id_idx on public.board_reports(reporter_id);

alter table public.board_member_bans enable row level security;
alter table public.board_reports enable row level security;

grant select, insert, delete on public.board_member_bans to authenticated;
grant select, insert on public.board_reports to authenticated;

do $$
begin
  if to_regclass('public.board_member_blocks') is not null then
    execute 'drop policy if exists "board_member_blocks_manage_self" on public.board_member_blocks';
  end if;
end $$;

drop table if exists public.board_member_blocks;

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

revoke all on function private.get_user_created_board_count(uuid) from public;
revoke all on function private.get_user_joined_board_count(uuid) from public;
revoke all on function private.get_board_member_count(uuid) from public;
revoke all on function private.get_board_snag_count(uuid) from public;
grant execute on function private.get_user_created_board_count(uuid) to authenticated;
grant execute on function private.get_user_joined_board_count(uuid) to authenticated;
grant execute on function private.get_board_member_count(uuid) to authenticated;
grant execute on function private.get_board_snag_count(uuid) to authenticated;

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

drop policy if exists "board_member_bans_owner_manage" on public.board_member_bans;

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

drop policy if exists "board_reports_select_own" on public.board_reports;

create policy "board_reports_select_own"
on public.board_reports for select
to authenticated
using (
  reporter_id = (select auth.uid())
);

drop policy if exists "board_reports_insert_member" on public.board_reports;

create policy "board_reports_insert_member"
on public.board_reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and private.is_board_member(board_reports.board_id, (select auth.uid()))
);

drop policy if exists "boards_insert_owner" on public.boards;

create policy "boards_insert_owner"
on public.boards for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and private.get_user_created_board_count((select auth.uid())) < 2
  and private.get_user_joined_board_count((select auth.uid())) < 3
);

drop policy if exists "board_members_insert_self" on public.board_members;

create policy "board_members_insert_self"
on public.board_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.get_user_joined_board_count((select auth.uid())) < 3
  and private.get_board_member_count(board_members.board_id) < 8
);

drop policy if exists "board_snags_insert_members" on public.board_snags;

create policy "board_snags_insert_members"
on public.board_snags for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and private.is_board_member(board_snags.board_id, (select auth.uid()))
  and private.get_board_snag_count(board_snags.board_id) < 60
);
