import type { Request, Response, NextFunction } from 'express';
import {
  GUEST_ID_MAX_LENGTH,
  GUEST_ID_PREFIX,
} from '../config.js';
import { isLegacyAnalysisClientsAllowed } from '../config/legacyAnalysisConfig.js';
import { getAnalyzeErrorCopy } from '../i18n/analyzeErrors.js';
import { resolveCoachLanguage } from '../i18n/uiLanguage.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../services/supabase/supabaseAdminClient.js';
import { extractBearerToken, extractClientVersionHeader, extractGuestIdHeader } from '../utils/authHeaders.js';
import type { RequestWithId } from './requestId.js';
import { logLegacyAnalysisClientRequest } from '../utils/safeServerLog.js';
import { failed, sendFailed } from '../utils/response.js';

export type AnalysisRequestIdentity =
  | { type: 'authenticated'; userId: string }
  | { type: 'guest'; guestId: string }
  | { type: 'legacy' };

export type AnalysisIdentityRequest = Request & {
  analysisIdentity?: AnalysisRequestIdentity;
};

export type AnalysisIdentityFailure =
  | 'identity_required'
  | 'invalid_guest_id'
  | 'unauthorized'
  | 'auth_unavailable';

export function parseGuestId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith(GUEST_ID_PREFIX)) return null;
  if (trimmed.length <= GUEST_ID_PREFIX.length) return null;
  if (trimmed.length > GUEST_ID_MAX_LENGTH) return null;
  if (!/^guest-[a-zA-Z0-9._-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function getAnalysisRateLimitKey(identity: AnalysisRequestIdentity): string {
  if (identity.type === 'authenticated') {
    return `user:${identity.userId}`;
  }
  if (identity.type === 'guest') {
    return `guest:${identity.guestId}`;
  }
  return 'legacy:unsupported';
}

export function getLegacyAnalysisRateLimitKey(ip: string): string {
  return `legacy-ip:${ip}`;
}

export type VerifyAnalysisBearer = (
  token: string,
) => Promise<{ type: 'authenticated'; userId: string } | Extract<AnalysisIdentityFailure, 'unauthorized' | 'auth_unavailable'>>;

export async function verifyAnalysisBearerToken(
  token: string,
): Promise<{ type: 'authenticated'; userId: string } | Extract<AnalysisIdentityFailure, 'unauthorized' | 'auth_unavailable'>> {
  if (!isSupabaseAdminConfigured()) {
    return 'auth_unavailable';
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return 'auth_unavailable';
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) {
    return 'unauthorized';
  }

  return { type: 'authenticated', userId: data.user.id };
}

export async function resolveAnalysisRequestIdentity(
  req: Request,
  verifyBearer: VerifyAnalysisBearer = verifyAnalysisBearerToken,
): Promise<AnalysisRequestIdentity | AnalysisIdentityFailure> {
  const bearerToken = extractBearerToken(req);

  if (bearerToken) {
    return verifyBearer(bearerToken);
  }

  const guestRaw = extractGuestIdHeader(req);
  if (guestRaw) {
    const guestId = parseGuestId(guestRaw);
    if (!guestId) {
      return 'invalid_guest_id';
    }

    return { type: 'guest', guestId };
  }

  if (isLegacyAnalysisClientsAllowed()) {
    return { type: 'legacy' };
  }

  return 'identity_required';
}

function identityFailureMessage(
  failure: AnalysisIdentityFailure,
  uiLanguage: ReturnType<typeof resolveCoachLanguage>,
): string {
  const copy = getAnalyzeErrorCopy(uiLanguage);
  switch (failure) {
    case 'identity_required':
      return copy.identityRequired;
    case 'invalid_guest_id':
      return copy.invalidGuestId;
    case 'unauthorized':
      return copy.unauthorized;
    case 'auth_unavailable':
      return copy.authUnavailable;
    default:
      return copy.serverError;
  }
}

function identityFailureStatus(failure: AnalysisIdentityFailure): number {
  switch (failure) {
    case 'invalid_guest_id':
      return 400;
    case 'auth_unavailable':
      return 503;
    case 'identity_required':
    case 'unauthorized':
    default:
      return 401;
  }
}

/**
 * Resolves signed-in Supabase user (Bearer), validated guest id (x-guest-id),
 * or temporary legacy mode when enabled. Body userId is never trusted.
 */
export async function requireAnalysisIdentity(
  req: AnalysisIdentityRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const uiLanguage = resolveCoachLanguage(req.body?.uiLanguage);
  const resolved = await resolveAnalysisRequestIdentity(req);

  if (typeof resolved === 'string') {
    sendFailed(
      res,
      identityFailureStatus(resolved),
      failed(resolved, identityFailureMessage(resolved, uiLanguage)),
    );
    return;
  }

  req.analysisIdentity = resolved;

  if (resolved.type === 'legacy') {
    logLegacyAnalysisClientRequest(req as RequestWithId, {
      clientVersion: extractClientVersionHeader(req),
    });
  }

  next();
}
