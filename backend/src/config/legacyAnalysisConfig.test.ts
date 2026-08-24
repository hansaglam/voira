import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isLegacyAnalysisClientsAllowed,
  isLegacyAnalysisFlagEnabled,
  isLegacyAnalysisSunsetPassed,
  parseLegacyAnalysisClientsUntil,
  validateLegacyAnalysisConfig,
} from '../config/legacyAnalysisConfig.js';
import { validateProductionConfig } from '../config.js';

function withEnv(
  values: Record<string, string | undefined>,
  fn: () => void,
): void {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    const next = values[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }

  try {
    fn();
  } finally {
    for (const key of Object.keys(values)) {
      const prev = previous[key];
      if (prev === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev;
      }
    }
  }
}

test('legacy flag defaults to enabled in development', () => {
  withEnv({ NODE_ENV: 'development', ALLOW_LEGACY_ANALYSIS_CLIENTS: undefined }, () => {
    assert.equal(isLegacyAnalysisFlagEnabled(), true);
  });
});

test('legacy flag defaults to disabled in production', () => {
  withEnv({ NODE_ENV: 'production', ALLOW_LEGACY_ANALYSIS_CLIENTS: undefined }, () => {
    assert.equal(isLegacyAnalysisFlagEnabled(), false);
  });
});

test('legacy flag can be explicitly enabled in production', () => {
  withEnv({ NODE_ENV: 'production', ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true' }, () => {
    assert.equal(isLegacyAnalysisFlagEnabled(), true);
    assert.equal(isLegacyAnalysisClientsAllowed(), true);
  });
});

test('legacy sunset in future allows legacy clients', () => {
  withEnv({
    NODE_ENV: 'production',
    ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true',
    LEGACY_ANALYSIS_CLIENTS_UNTIL: '2099-01-01T00:00:00Z',
  }, () => {
    assert.equal(isLegacyAnalysisSunsetPassed(), false);
    assert.equal(isLegacyAnalysisClientsAllowed(), true);
  });
});

test('legacy sunset expired rejects legacy clients', () => {
  withEnv({
    NODE_ENV: 'production',
    ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true',
    LEGACY_ANALYSIS_CLIENTS_UNTIL: '2020-01-01T00:00:00Z',
  }, () => {
    assert.equal(isLegacyAnalysisSunsetPassed(), true);
    assert.equal(isLegacyAnalysisClientsAllowed(), false);
  });
});

test('invalid sunset configuration throws at startup validation', () => {
  withEnv({ LEGACY_ANALYSIS_CLIENTS_UNTIL: 'not-a-date' }, () => {
    assert.throws(
      () => validateLegacyAnalysisConfig(),
      /LEGACY_ANALYSIS_CLIENTS_UNTIL must be a valid ISO-8601 timestamp/,
    );
  });
});

test('validateProductionConfig validates legacy sunset in development', () => {
  withEnv({
    NODE_ENV: 'development',
    LEGACY_ANALYSIS_CLIENTS_UNTIL: 'not-a-date',
  }, () => {
    assert.throws(
      () => validateProductionConfig(),
      /LEGACY_ANALYSIS_CLIENTS_UNTIL/,
    );
  });
});

test('parseLegacyAnalysisClientsUntil returns null when unset', () => {
  withEnv({ LEGACY_ANALYSIS_CLIENTS_UNTIL: undefined }, () => {
    assert.equal(parseLegacyAnalysisClientsUntil(), null);
  });
});
