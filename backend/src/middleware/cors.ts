import cors from 'cors';
import { ALLOWED_ORIGINS, BACKEND_PUBLIC_URL, IS_DEV } from '../config.js';

if (IS_DEV) {
  console.log('[EchoSpeak CORS] allowed origins:', ALLOWED_ORIGINS);
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

function isBackendPublicOrigin(origin: string): boolean {
  if (!BACKEND_PUBLIC_URL) return false;
  return normalizeOrigin(origin) === normalizeOrigin(BACKEND_PUBLIC_URL);
}

function isOriginAllowed(origin: string): boolean {
  const normalized = normalizeOrigin(origin);

  if (ALLOWED_ORIGINS.some((allowed: string) => normalizeOrigin(allowed) === normalized)) {
    return true;
  }

  return isBackendPublicOrigin(origin);
}

export const corsMiddleware = cors({
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Mobile/native clients often omit Origin — always allow.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (IS_DEV && ALLOWED_ORIGINS.length === 0) {
      callback(null, true);
      return;
    }

    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin rejected: ${origin}`));
  },
});
