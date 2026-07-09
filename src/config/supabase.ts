import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
  type SupabasePublicConfig,
} from '@/utils/social-sync';

export function getSnagSupabaseConfig(): SupabasePublicConfig {
  return getSupabasePublicConfig();
}

export function isSnagSupabaseConfigured() {
  return isSupabaseConfigured(getSnagSupabaseConfig());
}
