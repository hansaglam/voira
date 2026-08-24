import type { RequestWithId } from '../middleware/requestId.js';

const REDACTED_KEYS = new Set([
  'authorization',
  'cookie',
  'x-admin-secret',
  'ocp-apim-subscription-key',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'supabase_service_role_key',
  'openai_api_key',
]);

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      safe[key] = '[redacted]';
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

export function logServerError(
  message: string,
  options: {
    req?: RequestWithId;
    error: unknown;
    meta?: Record<string, unknown>;
  },
): void {
  const err = options.error instanceof Error
    ? options.error
    : new Error(typeof options.error === 'string' ? options.error : 'unknown_error');

  const payload = {
    level: 'error',
    message,
    requestId: options.req?.requestId,
    method: options.req?.method,
    path: options.req?.originalUrl ?? options.req?.url,
    errorName: err.name,
    errorMessage: err.message,
    ...(options.meta ? sanitizeMeta(options.meta) : {}),
  };

  console.error('[Voira Backend]', JSON.stringify(payload));
}

export function logLegacyAnalysisClientRequest(
  req: RequestWithId,
  options?: { clientVersion?: string | null },
): void {
  const payload: Record<string, unknown> = {
    level: 'info',
    event: 'analysis_legacy_client_request',
    requestId: req.requestId,
    route: req.originalUrl ?? req.url,
    timestamp: new Date().toISOString(),
  };

  if (options?.clientVersion) {
    payload.clientVersion = options.clientVersion;
  }

  console.log('[Voira Backend]', JSON.stringify(payload));
}
