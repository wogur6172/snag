import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync(new URL('../src/native/snag-library-storage.ts', import.meta.url), 'utf8');
const socialCacheSource = readFileSync(new URL('../src/native/social-board-cache-storage.ts', import.meta.url), 'utf8');

describe('snag library native storage', () => {
  it('rebases saved image URIs while loading the library', () => {
    assert.match(source, /resolveStoredSnagImageUri/);
    assert.match(source, /storedImage\.exists/);
    assert.match(source, /snags: state\.snags\.map/);
  });

  it('rebases pending social image URIs before retrying uploads', () => {
    assert.match(source, /export function resolvePersistedSnagImage/);
    assert.match(socialCacheSource, /resolvePersistedSnagImage/);
    assert.match(socialCacheSource, /Object\.entries\(state\.snagsByRoomId\)/);
  });
});
