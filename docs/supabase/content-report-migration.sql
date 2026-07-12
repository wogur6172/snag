-- Adds a stable content reference for reporter-only Snag hiding.

alter table public.board_reports
  add column if not exists snag_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'board_reports_snag_fk'
      and conrelid = 'public.board_reports'::regclass
  ) then
    alter table public.board_reports
      add constraint board_reports_snag_fk
      foreign key (board_id, snag_id) references public.board_snags(board_id, id) on delete cascade;
  end if;
end
$$;

alter table public.board_reports
  drop constraint if exists board_reports_snag_type_check;

alter table public.board_reports
  add constraint board_reports_snag_type_check check (
    (type = 'snag' and snag_id is not null)
    or (type <> 'snag' and snag_id is null)
  );

create index if not exists board_reports_snag_id_idx
  on public.board_reports(board_id, snag_id)
  where snag_id is not null;

drop policy if exists "board_reports_insert_member" on public.board_reports;

create policy "board_reports_insert_member"
on public.board_reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and private.is_board_member(board_reports.board_id, (select auth.uid()))
  and (
    type <> 'snag'
    or exists (
      select 1
      from public.board_snags
      where board_snags.board_id = board_reports.board_id
        and board_snags.id = board_reports.snag_id
        and board_snags.owner_id = board_reports.target_user_id
    )
  )
);
