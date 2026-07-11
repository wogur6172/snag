import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  BOARD_SNAG_PREVIEW_CONTENT_TYPE,
  BOARD_SNAG_PREVIEW_EXTENSION,
  BOARD_SNAG_PREVIEW_MAX_EDGE,
  BOARD_SNAG_PREVIEW_QUALITY,
  getBoardSnagPreviewContentType,
  getBoardSnagPreviewDimensions,
  getBoardSnagOriginalContentType,
  getBoardSnagOriginalStoragePath,
  getBoardSnagPreviewResizeAction,
  getBoardSnagPreviewStoragePath,
  isBoardSnagPreviewEnabled,
} from '../src/utils/board-images.ts';

describe('board image previews', () => {
  it('uses an Expo statically inlinable production preview flag', () => {
    const source = readFileSync(new URL('../src/utils/board-images.ts', import.meta.url), 'utf8');

    assert.match(source, /process\.env\.EXPO_PUBLIC_SNAG_BOARD_PREVIEW_ENABLED/);
    assert.doesNotMatch(source, /env: BoardSnagPreviewEnv = process\.env/);
  });

  it('keeps social board previews small and cheap to render', () => {
    assert.equal(BOARD_SNAG_PREVIEW_MAX_EDGE, 384);
    assert.equal(BOARD_SNAG_PREVIEW_QUALITY, 0.62);
    assert.equal(BOARD_SNAG_PREVIEW_EXTENSION, 'webp');
    assert.equal(BOARD_SNAG_PREVIEW_CONTENT_TYPE, 'image/webp');
  });

  it('resizes only the longest edge and avoids upscaling tiny snags', () => {
    assert.deepEqual(getBoardSnagPreviewResizeAction({ height: 2000, width: 3000 }), { width: 384 });
    assert.deepEqual(getBoardSnagPreviewResizeAction({ height: 3000, width: 2000 }), { height: 384 });
    assert.deepEqual(getBoardSnagPreviewResizeAction({ height: 480, width: 360 }), { height: 384 });
    assert.equal(getBoardSnagPreviewResizeAction({ height: 320, width: 240 }), null);
    assert.deepEqual(getBoardSnagPreviewResizeAction({}), { width: 384 });
  });

  it('predicts preview dimensions for saved board metadata', () => {
    assert.deepEqual(getBoardSnagPreviewDimensions({ height: 2000, width: 3000 }), {
      height: 256,
      width: 384,
    });
    assert.deepEqual(getBoardSnagPreviewDimensions({ height: 480, width: 360 }), {
      height: 384,
      width: 288,
    });
    assert.deepEqual(getBoardSnagPreviewDimensions({ height: 320, width: 240 }), {
      height: 320,
      width: 240,
    });
    assert.deepEqual(getBoardSnagPreviewDimensions({}), {});
  });

  it('stores social board snags under preview webp paths', () => {
    assert.equal(
      getBoardSnagPreviewStoragePath({ roomId: 'board-1', snagId: 'snag-1' }),
      'board-1/previews/snag-1.webp',
    );
    assert.equal(getBoardSnagPreviewContentType(), 'image/webp');
  });

  it('keeps a legacy original path only for cleaning up old uploads', () => {
    assert.equal(
      getBoardSnagOriginalStoragePath({ roomId: 'board-1', snagId: 'snag-1' }),
      'board-1/snag-1.png',
    );
    assert.equal(getBoardSnagOriginalContentType(), 'image/png');
  });

  it('keeps native preview generation off until the rebuilt dev client opts in', () => {
    assert.equal(isBoardSnagPreviewEnabled({}), false);
    assert.equal(isBoardSnagPreviewEnabled({ EXPO_PUBLIC_SNAG_BOARD_PREVIEW_ENABLED: 'false' }), false);
    assert.equal(isBoardSnagPreviewEnabled({ EXPO_PUBLIC_SNAG_BOARD_PREVIEW_ENABLED: 'true' }), true);
  });
});
