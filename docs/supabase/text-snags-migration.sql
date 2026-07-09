-- Snag social board text Snags migration.
-- Run this once in the Supabase SQL editor if social-schema.sql was applied
-- before Text Snags were added.

alter table public.board_snags
  add column if not exists kind text not null default 'image';

alter table public.board_snags
  add column if not exists text_value text;

alter table public.board_snags
  alter column image_path drop not null;

alter table public.board_snags
  drop constraint if exists board_snags_kind_check;

alter table public.board_snags
  add constraint board_snags_kind_check
  check (kind in ('image', 'text'));

alter table public.board_snags
  drop constraint if exists board_snags_kind_payload_check;

alter table public.board_snags
  add constraint board_snags_kind_payload_check
  check (
    (kind = 'image' and image_path is not null)
    or (
      kind = 'text'
      and text_value is not null
      and char_length(text_value) between 1 and 42
    )
  );
