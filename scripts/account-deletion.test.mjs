import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  ACCOUNT_DELETION_COPY,
  getAccountDeletionPresentation,
  getPostDeletionLibraryState,
  shouldClearLocalData,
} from '../src/utils/account-deletion.ts';
import { getDefaultSnagLibraryState } from '../src/utils/snag-library.ts';

describe('account deletion rules', () => {
  test('explains every destructive effect before deletion', () => {
    assert.match(ACCOUNT_DELETION_COPY.body, /collection/i);
    assert.match(ACCOUNT_DELETION_COPY.body, /shared-board posts/i);
    assert.match(ACCOUNT_DELETION_COPY.body, /account/i);
    assert.match(ACCOUNT_DELETION_COPY.body, /new owner/i);
    assert.match(ACCOUNT_DELETION_COPY.body, /Photos won't be deleted/i);
  });

  test('clears local data only after confirmed cloud deletion', () => {
    assert.equal(shouldClearLocalData({ deleted: true }), true);
    assert.equal(shouldClearLocalData({ deleted: false }), false);
    assert.equal(shouldClearLocalData(null), false);
  });

  test('returns the normal first-install state after deletion', () => {
    assert.deepEqual(getPostDeletionLibraryState(), getDefaultSnagLibraryState());
  });

  test('keeps progress and failure feedback concise', () => {
    assert.equal(getAccountDeletionPresentation('deleting').blocksInteraction, true);
    assert.match(getAccountDeletionPresentation('failed').message, /Nothing on this device was cleared/);
    assert.equal(getAccountDeletionPresentation('deleted').message, 'Your data has been deleted.');
  });
});
