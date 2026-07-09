import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getAutoCutoutBadge,
  getAutoCutoutSymbol,
  getCameraCaptureFlashMode,
  getFlashSymbol,
  getNextFlashMode,
} from '../src/utils/camera-controls.ts';

describe('camera control states', () => {
  it('cycles flash from off to auto to on', () => {
    assert.equal(getNextFlashMode('off'), 'auto');
    assert.equal(getNextFlashMode('auto'), 'on');
    assert.equal(getNextFlashMode('on'), 'off');
  });

  it('uses icon state instead of an active button treatment', () => {
    assert.equal(getFlashSymbol('off'), 'bolt.slash.fill');
    assert.equal(getFlashSymbol('auto'), 'bolt.badge.a.fill');
    assert.equal(getFlashSymbol('on'), 'bolt.fill');
    assert.equal(getAutoCutoutSymbol(true), 'wand.and.stars');
    assert.equal(getAutoCutoutSymbol(false), 'wand.and.stars');
    assert.equal(getAutoCutoutBadge(true), 'A');
    assert.equal(getAutoCutoutBadge(false), null);
  });

  it('uses screen flash only for front camera captures with flash on', () => {
    assert.equal(getCameraCaptureFlashMode({ facing: 'front', flash: 'on' }), 'screen');
    assert.equal(getCameraCaptureFlashMode({ facing: 'front', flash: 'auto' }), 'auto');
    assert.equal(getCameraCaptureFlashMode({ facing: 'back', flash: 'on' }), 'on');
  });
});
