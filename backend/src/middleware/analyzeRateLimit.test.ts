import assert from 'node:assert/strict';
import test from 'node:test';
import type { AnalysisIdentityRequest } from './analysisRequestIdentity.js';
import {
  getAnalysisRateLimitKey,
  getLegacyAnalysisRateLimitKey,
} from './analysisRequestIdentity.js';

test('modern identity rate-limit key uses authenticated user id', () => {
  assert.equal(
    getAnalysisRateLimitKey({ type: 'authenticated', userId: 'user-abc' }),
    'user:user-abc',
  );
});

test('modern identity rate-limit key uses guest id', () => {
  assert.equal(
    getAnalysisRateLimitKey({ type: 'guest', guestId: 'guest-xyz' }),
    'guest:guest-xyz',
  );
});

test('legacy identity uses dedicated IP bucket key', () => {
  assert.equal(getLegacyAnalysisRateLimitKey('198.51.100.4'), 'legacy-ip:198.51.100.4');
});

test('legacy clients skip modern identity bucket', () => {
  const legacyReq = {
    analysisIdentity: { type: 'legacy' },
  } as AnalysisIdentityRequest;

  assert.equal(legacyReq.analysisIdentity?.type, 'legacy');
  assert.notEqual(
    getAnalysisRateLimitKey({ type: 'legacy' }),
    getLegacyAnalysisRateLimitKey('198.51.100.4'),
  );
});

test('analyze rate limit response shape matches mobile contract', () => {
  const body = {
    ok: false,
    errorCode: 'rate_limited',
    messageTr: 'Çok fazla analiz isteği gönderildi. Lütfen biraz sonra tekrar dene.',
  };

  assert.equal(body.ok, false);
  assert.equal(body.errorCode, 'rate_limited');
  assert.match(body.messageTr, /Çok fazla analiz isteği/);
});
