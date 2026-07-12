import { createClient } from '@supabase/supabase-js';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: JSON_HEADERS,
    status,
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const authorization = request.headers.get('Authorization') ?? '';

  if (!authorization.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  const token = authorization.slice('Bearer '.length);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Deletion service is unavailable.' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  const { data: job, error: cleanupError } = await admin
    .rpc('prepare_account_deletion', { target_user_id: user.id })
    .single();

  if (cleanupError || !job) {
    return jsonResponse({ error: 'Could not prepare account deletion.' }, 500);
  }

  const storagePaths = Array.isArray(job.storage_paths)
    ? job.storage_paths.filter((path): path is string => typeof path === 'string' && path.length > 0)
    : [];

  if (storagePaths.length > 0) {
    const { error: storageError } = await admin.storage.from('board-snags').remove(storagePaths);

    if (storageError) {
      return jsonResponse({ error: 'Could not delete stored Snags.' }, 500);
    }
  }

  const { error: signOutError } = await admin.auth.admin.signOut(token, 'global');

  if (signOutError) {
    return jsonResponse({ error: 'Could not revoke the account session.' }, 500);
  }

  const { error: jobError } = await admin
    .from('account_deletion_jobs').delete()
    .eq('id', job.job_id);

  if (jobError) {
    return jsonResponse({ error: 'Could not finish account cleanup.' }, 500);
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    return jsonResponse({ error: 'Could not delete the account.' }, 500);
  }

  return new Response(JSON.stringify({ deleted: true }), {
    headers: JSON_HEADERS,
    status: 200,
  });
});
