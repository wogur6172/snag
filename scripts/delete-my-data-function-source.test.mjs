import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const source = await readFile(new URL('../supabase/functions/delete-my-data/index.ts', import.meta.url), 'utf8');

describe('delete-my-data Edge Function source', () => {
  test('derives deletion authority only from a verified bearer token', () => {
    assert.match(source, /const token = authorization\.slice\('Bearer '\.length\)/);
    assert.match(source, /auth\.getUser\(token\)/);
    assert.match(source, /target_user_id: user\.id/);
    assert.doesNotMatch(source, /requestBody|body\.userId|body\.user_id/);
  });

  test('cleans relational data, Storage, sessions, and the Auth user', () => {
    assert.match(source, /rpc\('prepare_account_deletion'/);
    assert.match(source, /storage\.from\('board-snags'\)\.remove/);
    assert.match(source, /auth\.admin\.signOut\(token, 'global'\)/);
    assert.match(source, /auth\.admin\.deleteUser\(user\.id\)/);
    assert.match(source, /from\('account_deletion_jobs'\)\.delete/);
  });

  test('keeps server secrets server-side and responses free of identifiers', () => {
    assert.match(source, /Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
    assert.match(source, /JSON\.stringify\(\{ deleted: true \}\)/);
    assert.doesNotMatch(source, /console\.log\(.*token/);
  });
});
