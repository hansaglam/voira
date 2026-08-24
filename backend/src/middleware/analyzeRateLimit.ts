import rateLimit from 'express-rate-limit';
import {
  ANALYZE_IP_RATE_LIMIT_PER_MINUTE,
  ANALYZE_RATE_LIMIT_PER_MINUTE,
  LEGACY_ANALYZE_RATE_LIMIT_PER_MINUTE,
} from '../config.js';
import type { AnalysisIdentityRequest } from './analysisRequestIdentity.js';
import {
  getAnalysisRateLimitKey,
  getLegacyAnalysisRateLimitKey,
} from './analysisRequestIdentity.js';

function resolveClientIp(req: AnalysisIdentityRequest): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function rateLimitHandler(_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }): void {
  res.status(429).json({
    ok: false,
    errorCode: 'rate_limited',
    messageTr: 'Çok fazla analiz isteği gönderildi. Lütfen biraz sonra tekrar dene.',
  });
}

export const analyzeIdentityRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: ANALYZE_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => (req as AnalysisIdentityRequest).analysisIdentity?.type === 'legacy',
  keyGenerator: (req) => {
    const identity = (req as AnalysisIdentityRequest).analysisIdentity;
    if (identity && identity.type !== 'legacy') {
      return getAnalysisRateLimitKey(identity);
    }
    return `ip:${resolveClientIp(req as AnalysisIdentityRequest)}`;
  },
  handler: rateLimitHandler,
});

/** Defense-in-depth IP cap — applies to all clients including legacy. */
export const analyzeIpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: ANALYZE_IP_RATE_LIMIT_PER_MINUTE,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${resolveClientIp(req as AnalysisIdentityRequest)}`,
  handler: rateLimitHandler,
});

/** Stricter per-IP cap for legacy clients without modern identity headers. */
export const analyzeLegacyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: LEGACY_ANALYZE_RATE_LIMIT_PER_MINUTE,
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => (req as AnalysisIdentityRequest).analysisIdentity?.type !== 'legacy',
  keyGenerator: (req) => getLegacyAnalysisRateLimitKey(
    resolveClientIp(req as AnalysisIdentityRequest),
  ),
  handler: rateLimitHandler,
});

/** @deprecated use analyzeIdentityRateLimit — kept for tests referencing analyzeRateLimit */
export const analyzeRateLimit = analyzeIdentityRateLimit;
