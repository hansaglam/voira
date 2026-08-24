/**
 * Temporary backward compatibility for mobile clients that predate
 * Bearer / x-guest-id analysis identity headers.
 */

function isDevNodeEnv(): boolean {
  return (process.env.NODE_ENV ?? 'development') !== 'production';
}

function parseAllowLegacyFlag(): boolean {
  const raw = process.env.ALLOW_LEGACY_ANALYSIS_CLIENTS?.trim().toLowerCase();
  if (raw === undefined || raw === '') {
    return isDevNodeEnv();
  }
  if (raw === 'true' || raw === '1') {
    return true;
  }
  if (raw === 'false' || raw === '0') {
    return false;
  }
  return isDevNodeEnv();
}

/** Whether the legacy compatibility flag is enabled (ignores sunset). */
export function isLegacyAnalysisFlagEnabled(): boolean {
  return parseAllowLegacyFlag();
}

/**
 * Parse optional sunset timestamp. Throws on malformed values so startup fails fast.
 */
export function parseLegacyAnalysisClientsUntil(): Date | null {
  const raw = process.env.LEGACY_ANALYSIS_CLIENTS_UNTIL?.trim();
  if (!raw) {
    return null;
  }

  const parsedMs = Date.parse(raw);
  if (!Number.isFinite(parsedMs)) {
    throw new Error(
      'LEGACY_ANALYSIS_CLIENTS_UNTIL must be a valid ISO-8601 timestamp',
    );
  }

  return new Date(parsedMs);
}

export function isLegacyAnalysisSunsetPassed(now: Date = new Date()): boolean {
  const until = parseLegacyAnalysisClientsUntil();
  if (!until) {
    return false;
  }
  return now.getTime() > until.getTime();
}

/** Flag enabled and sunset (if configured) has not passed. */
export function isLegacyAnalysisClientsAllowed(now: Date = new Date()): boolean {
  if (!isLegacyAnalysisFlagEnabled()) {
    return false;
  }
  return !isLegacyAnalysisSunsetPassed(now);
}

export function validateLegacyAnalysisConfig(): void {
  parseLegacyAnalysisClientsUntil();
}
