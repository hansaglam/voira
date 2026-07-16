import { getSupabaseAdminClient, isSupabaseAdminConfigured } from './supabase/supabaseAdminClient.js';

export type AccountDeletionResult =
  | { ok: true; userId: string }
  | { ok: false; errorCode: string; messageTr: string };

/**
 * Deletes the Supabase Auth user identified by a verified JWT subject.
 *
 * Voira currently stores progress / vocabulary locally on device; there are no
 * per-user app tables to wipe server-side yet. Auth user deletion is the
 * authoritative account removal. Local caches are cleared by the mobile client
 * after a successful response.
 */
export async function deleteAuthenticatedAccount(
  verifiedUserId: string,
): Promise<AccountDeletionResult> {
  const userId = verifiedUserId.trim();
  if (!userId) {
    return {
      ok: false,
      errorCode: 'unauthorized',
      messageTr: 'Bu işlem için giriş yapman gerekiyor.',
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      errorCode: 'auth_unavailable',
      messageTr: 'Hesap silme şu an kullanılamıyor. Lütfen daha sonra tekrar dene.',
    };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      ok: false,
      errorCode: 'auth_unavailable',
      messageTr: 'Hesap silme şu an kullanılamıyor. Lütfen daha sonra tekrar dene.',
    };
  }

  const { error } = await client.auth.admin.deleteUser(userId);
  if (error) {
    const message = (error.message ?? '').toLowerCase();
    if (message.includes('not found') || message.includes('user not found')) {
      // Already gone — treat as success so the client can finish local cleanup.
      return { ok: true, userId };
    }

    console.error('[EchoSpeak AccountDelete] admin.deleteUser failed', {
      code: (error as { status?: number }).status ?? null,
    });

    return {
      ok: false,
      errorCode: 'delete_failed',
      messageTr: 'Hesap silinemedi. Lütfen tekrar dene.',
    };
  }

  return { ok: true, userId };
}
