import type { SupabaseClient } from '@supabase/supabase-js';

export type AccountDeletionResult = {
  deleted: true;
};

export async function deleteMySnagDataAsync({
  client,
}: {
  client: SupabaseClient | null;
}): Promise<AccountDeletionResult> {
  if (!client) {
    throw new Error('Snag social services are unavailable.');
  }

  const sessionResult = await client.auth.getSession();

  if (sessionResult.error || !sessionResult.data.session) {
    throw new Error('No active Snag account was found.');
  }

  const { data, error } = await client.functions.invoke<AccountDeletionResult>('delete-my-data', { method: 'POST' });

  if (error || data?.deleted !== true) {
    throw new Error('Snag could not delete your account.');
  }

  return { deleted: true };
}
