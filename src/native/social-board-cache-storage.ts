import { Directory, File, Paths } from 'expo-file-system';

import {
  createSocialBoardCacheSnapshot,
  parseSocialBoardCacheSnapshot,
  type SocialBoardCacheState,
} from '@/utils/social-board-cache';

const SOCIAL_BOARD_CACHE_DIRECTORY = 'snag-social-cache';
const SOCIAL_BOARD_CACHE_FILE = 'boards.json';

function getSocialBoardCacheDirectory() {
  return new Directory(Paths.document, SOCIAL_BOARD_CACHE_DIRECTORY);
}

function getSocialBoardCacheFile() {
  return new File(getSocialBoardCacheDirectory(), SOCIAL_BOARD_CACHE_FILE);
}

function ensureSocialBoardCacheDirectory() {
  getSocialBoardCacheDirectory().create({ idempotent: true, intermediates: true });
}

export async function loadSocialBoardCacheAsync(): Promise<SocialBoardCacheState | null> {
  ensureSocialBoardCacheDirectory();

  const cacheFile = getSocialBoardCacheFile();

  if (!cacheFile.exists) {
    return null;
  }

  return parseSocialBoardCacheSnapshot(await cacheFile.text());
}

export async function saveSocialBoardCacheAsync(state: SocialBoardCacheState) {
  ensureSocialBoardCacheDirectory();
  getSocialBoardCacheFile().write(JSON.stringify(createSocialBoardCacheSnapshot(state)));
}
