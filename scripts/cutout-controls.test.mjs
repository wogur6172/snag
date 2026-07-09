import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getCaptureCutoutRoute,
  getCutoutFailureNotice,
  getCutoutNoticeDurationMs,
  getCutoutUnsupportedNotice,
} from '../src/utils/cutout-controls.ts';

describe('cutout control copy', () => {
  it('explains that unsupported devices can continue manually', () => {
    assert.equal(
      getCutoutUnsupportedNotice(),
      'Auto cutout needs iOS 17. Manual refine is ready.'
    );
  });

  it('keeps Vision failures calm and recoverable', () => {
    assert.equal(
      getCutoutFailureNotice(),
      'Auto cutout missed this one. Manual refine is ready.'
    );
  });

  it('keeps recovery notices temporary', () => {
    assert.equal(getCutoutNoticeDurationMs(), 1800);
  });

  it('routes captures directly from shutter based on auto cutout state', () => {
    assert.equal(
      getCaptureCutoutRoute({
        autoCutoutEnabled: true,
        hasImageUri: true,
        isCutoutSupported: true,
      }),
      'auto'
    );

    assert.equal(
      getCaptureCutoutRoute({
        autoCutoutEnabled: false,
        hasImageUri: true,
        isCutoutSupported: true,
      }),
      'manual'
    );

    assert.equal(
      getCaptureCutoutRoute({
        autoCutoutEnabled: true,
        hasImageUri: true,
        isCutoutSupported: false,
      }),
      'manual'
    );
  });

  it('does not start a cutout route without a real image uri', () => {
    assert.equal(
      getCaptureCutoutRoute({
        autoCutoutEnabled: true,
        hasImageUri: false,
        isCutoutSupported: false,
      }),
      'none'
    );
  });
});
