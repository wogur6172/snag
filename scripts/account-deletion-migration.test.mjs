import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const source = await readFile(new URL('../docs/supabase/account-deletion-migration.sql', import.meta.url), 'utf8');

describe('account deletion migration', () => {
  test('keeps deletion jobs private and service-role only', () => {
    assert.match(source, /create table if not exists public\.account_deletion_jobs/i);
    assert.match(source, /alter table public\.account_deletion_jobs enable row level security/i);
    assert.match(source, /revoke all on table public\.account_deletion_jobs from public, anon, authenticated/i);
    assert.match(source, /grant .* on table public\.account_deletion_jobs to service_role/i);
    assert.match(source, /revoke all on function public\.prepare_account_deletion\(uuid\) from public, anon, authenticated/i);
    assert.match(source, /grant execute on function public\.prepare_account_deletion\(uuid\) to service_role/i);
  });

  test('transfers shared boards deterministically and deletes sole-member boards', () => {
    assert.match(source, /order by board_members\.joined_at, board_members\.user_id/);
    assert.match(source, /update public\.boards/);
    assert.match(source, /delete from public\.boards/);
    assert.match(source, /remaining_member_count = 0/);
  });

  test('queues storage before removing every user-owned social record', () => {
    const queueIndex = source.indexOf('insert into public.account_deletion_jobs');
    const snagDeleteIndex = source.indexOf('delete from public.board_snags');

    assert.ok(queueIndex >= 0 && snagDeleteIndex > queueIndex);
    assert.match(source, /delete from public\.board_drawings/);
    assert.match(source, /delete from public\.board_members/);
    assert.match(source, /delete from public\.board_reports/);
    assert.match(source, /delete from public\.board_member_bans/);
    assert.match(source, /delete from public\.profiles/);
    assert.match(source, /storage\.objects/);
  });

  test('returns an existing job so retries are idempotent', () => {
    assert.match(source, /on conflict \(user_id\) do update/i);
    assert.match(source, /returns table \(job_id uuid, storage_paths text\[\]\)/i);
  });
});
