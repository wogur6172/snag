import { clearSnagLibraryStorageAsync } from '@/native/snag-library-storage';
import { clearSocialBoardCacheAsync } from '@/native/social-board-cache-storage';
import { snagSupabaseAuthStorage } from '@/services/supabase-auth-storage';

export async function clearAllSnagLocalDataAsync() {
  await clearSnagLibraryStorageAsync();
  await clearSocialBoardCacheAsync();
  await snagSupabaseAuthStorage.clear();
}
