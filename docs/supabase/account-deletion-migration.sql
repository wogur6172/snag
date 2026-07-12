-- Permanent account deletion support for Snag's anonymous social users.

create table if not exists public.account_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  storage_paths text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_deletion_jobs enable row level security;

revoke all on table public.account_deletion_jobs from public, anon, authenticated;
grant select, insert, update, delete on table public.account_deletion_jobs to service_role;

create or replace function public.prepare_account_deletion(target_user_id uuid)
returns table (job_id uuid, storage_paths text[])
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_board record;
  existing_job public.account_deletion_jobs%rowtype;
  next_owner_id uuid;
  queued_paths text[] := '{}'::text[];
  remaining_member_count integer;
begin
  select *
  into existing_job
  from public.account_deletion_jobs
  where user_id = $1;

  if found then
    return query select existing_job.id, existing_job.storage_paths;
    return;
  end if;

  select coalesce(array_agg(distinct storage.objects.name), '{}'::text[])
  into queued_paths
  from storage.objects
  where storage.objects.bucket_id = 'board-snags'
    and (
      storage.objects.owner_id = $1::text
      or exists (
        select 1
        from public.boards
        where public.boards.owner_id = $1
          and public.boards.id::text = split_part(storage.objects.name, '/', 1)
          and not exists (
            select 1
            from public.board_members
            where public.board_members.board_id = public.boards.id
              and public.board_members.user_id <> $1
          )
      )
    );

  insert into public.account_deletion_jobs (user_id, storage_paths, updated_at)
  values ($1, queued_paths, now())
  on conflict (user_id) do update
  set storage_paths = excluded.storage_paths,
      updated_at = excluded.updated_at
  returning id, public.account_deletion_jobs.storage_paths
  into job_id, storage_paths;

  for current_board in
    select public.boards.id
    from public.boards
    where public.boards.owner_id = $1
    order by public.boards.created_at, public.boards.id
  loop
    select count(*)
    into remaining_member_count
    from public.board_members
    where public.board_members.board_id = current_board.id
      and public.board_members.user_id <> $1;

    if remaining_member_count = 0 then
      delete from public.boards
      where public.boards.id = current_board.id;
    else
      select public.board_members.user_id
      into next_owner_id
      from public.board_members
      where public.board_members.board_id = current_board.id
        and public.board_members.user_id <> $1
      order by board_members.joined_at, board_members.user_id
      limit 1;

      update public.board_members
      set role = 'member'
      where public.board_members.board_id = current_board.id
        and public.board_members.user_id = $1;

      update public.board_members
      set role = 'owner'
      where public.board_members.board_id = current_board.id
        and public.board_members.user_id = next_owner_id;

      update public.boards
      set owner_id = next_owner_id,
          updated_at = now()
      where public.boards.id = current_board.id;
    end if;
  end loop;

  delete from public.board_snags
  where public.board_snags.owner_id = $1;

  delete from public.board_drawings
  where public.board_drawings.owner_id = $1;

  delete from public.board_reports
  where public.board_reports.reporter_id = $1
     or public.board_reports.target_user_id = $1;

  delete from public.board_member_bans
  where public.board_member_bans.user_id = $1
     or public.board_member_bans.created_by = $1;

  delete from public.board_members
  where public.board_members.user_id = $1;

  delete from public.profiles
  where public.profiles.id = $1;

  return next;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
