import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSnagSupabaseConfig } from '@/config/supabase';
import { snagSupabaseAuthStorage } from '@/services/supabase-auth-storage';
import { isSupabaseConfigured } from '@/utils/social-sync';

let cachedClient: SupabaseClient | null | undefined;

export function getSnagSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const config = getSnagSupabaseConfig();

  if (!isSupabaseConfigured(config)) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: snagSupabaseAuthStorage,
    },
  });

  return cachedClient;
}
