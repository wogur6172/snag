import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CAPTURE_ACTIVITY_MIN_VISIBLE_MS,
  getCaptureActivityDelayMs,
  getCaptureActivityPresentation,
} from '../src/utils/capture-feedback.ts';

describe('capture activity feedback', () => {
  it('describes recognition as blocking work over the captured frame', () => {
    assert.deepEqual(getCaptureActivityPresentation('recognizing'), {
      blocksInteraction: true,
      label: 'Finding your Snag...',
      showCapturedFrame: true,
      showOverlay: true,
    });
  });

  it('uses the same visual language while preparing manual refine and finalizing', () => {
    assert.equal(getCaptureActivityPresentation('preparing-manual').label, 'Preparing your canvas...');
    assert.deepEqual(getCaptureActivityPresentation('finalizing'), {
      blocksInteraction: true,
      label: 'Finishing your Snag...',
      showCapturedFrame: false,
      showOverlay: true,
    });
  });

  it('keeps shutter capture separate from the longer processing overlay', () => {
    assert.deepEqual(getCaptureActivityPresentation('capturing'), {
      blocksInteraction: true,
      label: '',
      showCapturedFrame: false,
      showOverlay: false,
    });
    assert.equal(getCaptureActivityPresentation('idle').blocksInteraction, false);
  });

  it('only waits for the remainder of the minimum visible duration', () => {
    assert.equal(CAPTURE_ACTIVITY_MIN_VISIBLE_MS, 600);
    assert.equal(getCaptureActivityDelayMs({ startedAtMs: 1_000, nowMs: 1_250 }), 350);
    assert.equal(getCaptureActivityDelayMs({ startedAtMs: 1_000, nowMs: 1_600 }), 0);
    assert.equal(getCaptureActivityDelayMs({ startedAtMs: 1_000, nowMs: 2_000 }), 0);
    assert.equal(getCaptureActivityDelayMs({ startedAtMs: 1_000, nowMs: 900 }), 600);
  });
});
