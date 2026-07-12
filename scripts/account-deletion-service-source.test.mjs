import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const source = await readFile(new URL('../src/services/account-deletion-service.ts', import.meta.url), 'utf8');

describe('account deletion mobile client source', () => {
  test('requires an active session before invoking deletion', () => {
    assert.match(source, /client\.auth\.getSession\(\)/);
    assert.match(source, /if \(sessionResult\.error \|\| !sessionResult\.data\.session\)/);
  });

  test('invokes deletion without accepting or sending a target user id', () => {
    assert.match(source, /functions\.invoke<AccountDeletionResult>\('delete-my-data', \{ method: 'POST' \}\)/);
    assert.doesNotMatch(source, /userId|user_id|target_user_id/);
  });

  test('accepts only an explicit deleted response', () => {
    assert.match(source, /if \(error \|\| data\?\.deleted !== true\)/);
    assert.match(source, /return \{ deleted: true \}/);
  });
});
