import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const librarySource = await readFile(new URL('../src/native/snag-library-storage.ts', import.meta.url), 'utf8');
const boardCacheSource = await readFile(new URL('../src/native/social-board-cache-storage.ts', import.meta.url), 'utf8');
const authStorageSource = await readFile(new URL('../src/services/supabase-auth-storage.ts', import.meta.url), 'utf8');

describe('local account data cleanup source', () => {
  test('each storage owner exposes an idempotent clear operation', () => {
    assert.match(librarySource, /export async function clearSnagLibraryStorageAsync/);
    assert.match(librarySource, /if \(libraryDirectory\.exists\)/);
    assert.match(boardCacheSource, /export async function clearSocialBoardCacheAsync/);
    assert.match(boardCacheSource, /if \(cacheDirectory\.exists\)/);
    assert.match(authStorageSource, /async clear\(\)/);
    assert.match(authStorageSource, /if \(authDirectory\.exists\)/);
  });

  test('never reaches into the iOS Photos library', () => {
    const combinedSource = `${librarySource}\n${boardCacheSource}\n${authStorageSource}`;

    assert.doesNotMatch(combinedSource, /expo-media-library/);
    assert.doesNotMatch(combinedSource, /deleteAssetsAsync/);
  });
});
