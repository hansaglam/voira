import rateLimit from 'express-rate-limit';
import {
  ROLEPLAY_GUEST_RATE_LIMIT_PER_MINUTE,
  ROLEPLAY_IP_RATE_LIMIT_PER_MINUTE,
  ROLEPLAY_RATE_LIMIT_PER_MINUTE,
} from '../config/roleplayConfig.js';
import type { AnalysisIdentityRequest } from './analysisRequestIdentity.js';
import { getAnalysisRateLimitKey } from './analysisRequestIdentity.js';

function resolveClientIp(req: AnalysisIdentityRequest): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function roleplayRateLimitHandler(
  _req: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): void {
  res.status(429).json({
    ok: false,
    errorCode: 'ROLEPLAY_RATE_LIMITED',
    messageTr: 'Çok fazla roleplay isteği gönderildi. Lütfen biraz sonra tekrar dene.',
  });
}

export const roleplayIdentityRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: ROLEPLAY_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const identity = (req as AnalysisIdentityRequest).analysisIdentity;
    return identity?.type === 'legacy' || identity?.type === 'guest';
  },
  keyGenerator: (req) => {
    const identity = (req as AnalysisIdentityRequest).analysisIdentity;
    if (identity && identity.type === 'authenticated') {
      return `roleplay:${getAnalysisRateLimitKey(identity)}`;
    }
    return `roleplay-ip:${resolveClientIp(req as AnalysisIdentityRequest)}`;
  },
  handler: roleplayRateLimitHandler,
});

export const roleplayGuestRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: ROLEPLAY_GUEST_RATE_LIMIT_PER_MINUTE,
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => (req as AnalysisIdentityRequest).analysisIdentity?.type !== 'guest',
  keyGenerator: (req) => {
    const identity = (req as AnalysisIdentityRequest).analysisIdentity;
    if (identity?.type === 'guest') {
      return `roleplay-guest:${getAnalysisRateLimitKey(identity)}`;
    }
    return `roleplay-guest-ip:${resolveClientIp(req as AnalysisIdentityRequest)}`;
  },
  handler: roleplayRateLimitHandler,
});

export const roleplayIpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: ROLEPLAY_IP_RATE_LIMIT_PER_MINUTE,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => `roleplay-ip:${resolveClientIp(req as AnalysisIdentityRequest)}`,
  handler: roleplayRateLimitHandler,
});
