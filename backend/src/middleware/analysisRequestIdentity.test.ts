import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAnalysisRateLimitKey,
  getLegacyAnalysisRateLimitKey,
  parseGuestId,
  resolveAnalysisRequestIdentity,
} from './analysisRequestIdentity.js';
import type { Request } from 'express';

function mockRequest(partial: {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}): Request {
  const headers = partial.headers ?? {};
  return {
    body: partial.body ?? {},
    header: ((name: string) => {
      const key = name.toLowerCase();
      if (key === 'authorization') return headers.authorization ?? headers.Authorization;
      if (key === 'x-guest-id') return headers['x-guest-id'] ?? headers['X-Guest-Id'];
      return headers[name] ?? headers[key];
    }) as Request['header'],
  } as Request;
}

function withLegacyEnv(
  values: Record<string, string | undefined>,
  fn: () => Promise<void> | void,
): Promise<void> | void {
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
    return fn();
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

test('parseGuestId accepts guest- prefixed ids', () => {
  assert.equal(parseGuestId('guest-abc-123'), 'guest-abc-123');
  assert.equal(parseGuestId('guest-550e8400-e29b-41d4-a716-446655440000'), 'guest-550e8400-e29b-41d4-a716-446655440000');
});

test('parseGuestId rejects malformed guest ids', () => {
  assert.equal(parseGuestId(''), null);
  assert.equal(parseGuestId('user-123'), null);
  assert.equal(parseGuestId('guest-'), null);
  assert.equal(parseGuestId('guest-bad id'), null);
  assert.equal(parseGuestId(`guest-${'a'.repeat(200)}`), null);
});

test('resolveAnalysisRequestIdentity requires identity when legacy disabled', async () => {
  await withLegacyEnv({ ALLOW_LEGACY_ANALYSIS_CLIENTS: 'false' }, async () => {
    const result = await resolveAnalysisRequestIdentity(mockRequest({ headers: {} }));
    assert.equal(result, 'identity_required');
  });
});

test('resolveAnalysisRequestIdentity accepts valid guest header', async () => {
  await withLegacyEnv({ ALLOW_LEGACY_ANALYSIS_CLIENTS: 'false' }, async () => {
    const result = await resolveAnalysisRequestIdentity(
      mockRequest({ headers: { 'x-guest-id': 'guest-test-uuid-1' } }),
    );
    assert.deepEqual(result, { type: 'guest', guestId: 'guest-test-uuid-1' });
  });
});

test('resolveAnalysisRequestIdentity rejects invalid guest header without legacy fallback', async () => {
  await withLegacyEnv({ ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true' }, async () => {
    const result = await resolveAnalysisRequestIdentity(
      mockRequest({ headers: { 'x-guest-id': 'not-a-guest' } }),
    );
    assert.equal(result, 'invalid_guest_id');
  });
});

test('resolveAnalysisRequestIdentity accepts legacy when flag enabled and no modern identity', async () => {
  await withLegacyEnv({ ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true' }, async () => {
    const result = await resolveAnalysisRequestIdentity(mockRequest({ headers: {} }));
    assert.deepEqual(result, { type: 'legacy' });
  });
});

test('resolveAnalysisRequestIdentity rejects legacy when flag disabled in production', async () => {
  await withLegacyEnv({
    NODE_ENV: 'production',
    ALLOW_LEGACY_ANALYSIS_CLIENTS: 'false',
  }, async () => {
    const result = await resolveAnalysisRequestIdentity(mockRequest({ headers: {} }));
    assert.equal(result, 'identity_required');
  });
});

test('resolveAnalysisRequestIdentity rejects legacy after sunset', async () => {
  await withLegacyEnv({
    ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true',
    LEGACY_ANALYSIS_CLIENTS_UNTIL: '2020-01-01T00:00:00Z',
  }, async () => {
    const result = await resolveAnalysisRequestIdentity(mockRequest({ headers: {} }));
    assert.equal(result, 'identity_required');
  });
});

test('resolveAnalysisRequestIdentity allows legacy before sunset', async () => {
  await withLegacyEnv({
    ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true',
    LEGACY_ANALYSIS_CLIENTS_UNTIL: '2099-01-01T00:00:00Z',
  }, async () => {
    const result = await resolveAnalysisRequestIdentity(mockRequest({ headers: {} }));
    assert.deepEqual(result, { type: 'legacy' });
  });
});

test('invalid Bearer does NOT fall back to legacy', async () => {
  await withLegacyEnv({ ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true' }, async () => {
    const result = await resolveAnalysisRequestIdentity(
      mockRequest({ headers: { authorization: 'Bearer invalid-token' } }),
      async () => 'unauthorized',
    );
    assert.equal(result, 'unauthorized');
  });
});

test('modern authenticated request remains preferred over guest and legacy', async () => {
  await withLegacyEnv({ ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true' }, async () => {
    const result = await resolveAnalysisRequestIdentity(
      mockRequest({
        headers: {
          authorization: 'Bearer valid-token',
          'x-guest-id': 'guest-should-not-win',
        },
        body: { userId: 'attacker-user-id' },
      }),
      async () => ({ type: 'authenticated', userId: 'verified-user-1' }),
    );
    assert.deepEqual(result, { type: 'authenticated', userId: 'verified-user-1' });
  });
});

test('valid guest request is preferred over legacy', async () => {
  await withLegacyEnv({ ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true' }, async () => {
    const result = await resolveAnalysisRequestIdentity(
      mockRequest({ headers: { 'x-guest-id': 'guest-preferred' } }),
    );
    assert.deepEqual(result, { type: 'guest', guestId: 'guest-preferred' });
  });
});

test('legacy identity never uses body userId', async () => {
  await withLegacyEnv({ ALLOW_LEGACY_ANALYSIS_CLIENTS: 'true' }, async () => {
    const result = await resolveAnalysisRequestIdentity(
      mockRequest({
        headers: {},
        body: { userId: 'attacker-user-id' },
      }),
    );
    assert.deepEqual(result, { type: 'legacy' });
    if (typeof result === 'object') {
      assert.notEqual((result as { userId?: string }).userId, 'attacker-user-id');
    }
  });
});

test('getAnalysisRateLimitKey uses verified identity', () => {
  assert.equal(
    getAnalysisRateLimitKey({ type: 'authenticated', userId: 'user-1' }),
    'user:user-1',
  );
  assert.equal(
    getAnalysisRateLimitKey({ type: 'guest', guestId: 'guest-abc' }),
    'guest:guest-abc',
  );
});

test('getLegacyAnalysisRateLimitKey scopes legacy clients by IP bucket', () => {
  assert.equal(getLegacyAnalysisRateLimitKey('203.0.113.10'), 'legacy-ip:203.0.113.10');
});

test('body userId is not used for guest identity resolution', async () => {
  await withLegacyEnv({ ALLOW_LEGACY_ANALYSIS_CLIENTS: 'false' }, async () => {
    const guest = await resolveAnalysisRequestIdentity(
      mockRequest({
        headers: { 'x-guest-id': 'guest-safe-id' },
        body: { userId: 'attacker-user-id' },
      }),
    );
    assert.deepEqual(guest, { type: 'guest', guestId: 'guest-safe-id' });
  });
});
