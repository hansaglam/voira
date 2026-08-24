import type { Request } from 'express';

export function extractBearerToken(req: Request): string | null {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export function extractGuestIdHeader(req: Request): string | null {
  const raw = req.header('x-guest-id') ?? req.header('X-Guest-Id');
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Informational client build label — never used for authentication. */
export function extractClientVersionHeader(req: Request): string | null {
  const raw = req.header('x-voira-client-version') ?? req.header('X-Voira-Client-Version');
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 64) return null;
  if (!/^[a-zA-Z0-9._+-]+$/.test(trimmed)) return null;
  return trimmed;
}
