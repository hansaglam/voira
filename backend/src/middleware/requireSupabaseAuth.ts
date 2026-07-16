import type { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../services/supabase/supabaseAdminClient.js';
import { failed, sendFailed } from '../utils/response.js';

export type AuthenticatedRequest = Request & {
  authUserId?: string;
};

function extractBearerToken(req: Request): string | null {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

/**
 * Verifies the caller's Supabase access token and attaches authUserId.
 * Never trusts a client-supplied userId body field.
 */
export async function requireSupabaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    sendFailed(
      res,
      503,
      failed('auth_unavailable', 'Kimlik doğrulama şu an kullanılamıyor. Lütfen daha sonra tekrar dene.'),
    );
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    sendFailed(
      res,
      401,
      failed('unauthorized', 'Bu işlem için giriş yapman gerekiyor.'),
    );
    return;
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    sendFailed(
      res,
      503,
      failed('auth_unavailable', 'Kimlik doğrulama şu an kullanılamıyor. Lütfen daha sonra tekrar dene.'),
    );
    return;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) {
    sendFailed(
      res,
      401,
      failed(
        'reauth_required',
        'Bu işlem için tekrar giriş yapman gerekebilir.',
      ),
    );
    return;
  }

  req.authUserId = data.user.id;
  next();
}

export function getAuthenticatedUserId(req: AuthenticatedRequest): string | null {
  return req.authUserId?.trim() || null;
}
