import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LOCAL_SNAG_PREVIEW_MAX_EDGE,
  getLocalSnagPreviewResizeAction,
  getSnagPreloadImageUri,
  getStoredSnagPreviewName,
  getSnagRenderImageUri,
} from '../src/utils/local-snag-preview.ts';
import { parseSnagLibrarySnapshot } from '../src/utils/snag-library.ts';

test('large landscape images are resized by their longest edge', () => {
  assert.deepEqual(
    getLocalSnagPreviewResizeAction({ height: 3024, width: 4032 }),
    { width: LOCAL_SNAG_PREVIEW_MAX_EDGE },
  );
});

test('large portrait images are resized by their longest edge', () => {
  assert.deepEqual(
    getLocalSnagPreviewResizeAction({ height: 4032, width: 3024 }),
    { height: LOCAL_SNAG_PREVIEW_MAX_EDGE },
  );
});

test('already small images do not create a redundant preview', () => {
  assert.equal(
    getLocalSnagPreviewResizeAction({ height: 900, width: 720 }),
    null,
  );
});

test('unknown image dimensions still request a bounded preview', () => {
  assert.deepEqual(
    getLocalSnagPreviewResizeAction({}),
    { width: LOCAL_SNAG_PREVIEW_MAX_EDGE },
  );
});

test('rendering prefers the lightweight preview without replacing the original', () => {
  const snag = {
    imageUri: 'file:///original.png',
    previewUri: 'file:///preview.webp',
  };

  assert.equal(getSnagRenderImageUri(snag), snag.previewUri);
  assert.equal(snag.imageUri, 'file:///original.png');
});

test('rendering falls back to the original while a preview is unavailable', () => {
  assert.equal(
    getSnagRenderImageUri({ imageUri: 'file:///original.png' }),
    'file:///original.png',
  );
});

test('startup preloading skips oversized originals until their preview exists', () => {
  assert.equal(getSnagPreloadImageUri({
    imageHeight: 3024,
    imageUri: 'file:///large-original.png',
    imageWidth: 4032,
  }), undefined);

  assert.equal(getSnagPreloadImageUri({
    imageHeight: 3024,
    imageUri: 'file:///large-original.png',
    imageWidth: 4032,
    previewUri: 'file:///preview.webp',
  }), 'file:///preview.webp');
});

test('startup preloading keeps small originals fast and immediately available', () => {
  assert.equal(getSnagPreloadImageUri({
    imageHeight: 720,
    imageUri: 'file:///small.png',
    imageWidth: 900,
  }), 'file:///small.png');
});

test('preview filenames are stable and independent of the original extension', () => {
  assert.equal(
    getStoredSnagPreviewName({ id: 'snag:legacy/1' }),
    'snag-legacy-1-preview.webp',
  );
});

test('persisted libraries keep separate original and preview image paths', () => {
  const state = parseSnagLibrarySnapshot({
    categories: [{ id: 'category-1', title: 'Category 1' }, { id: 'all', title: 'All' }],
    categoryGridPreferences: {},
    drawingsByCategoryId: {},
    selectedCategoryId: 'category-1',
    settings: { profileName: 'You' },
    snagCount: 1,
    snags: [{
      category: 'category-1',
      canvasX: 10,
      canvasY: 20,
      createdAt: 1,
      id: 'snag-1',
      imageHeight: 3024,
      imageUri: 'file:///original.png',
      imageWidth: 4032,
      previewUri: 'file:///preview.webp',
      rotate: '0deg',
      size: 200,
      title: 'Snag',
    }],
    version: 1,
  });

  assert.equal(state.snags[0].imageUri, 'file:///original.png');
  assert.equal(state.snags[0].previewUri, 'file:///preview.webp');
});
