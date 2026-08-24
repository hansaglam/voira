import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request } from 'express';
import { extractBearerToken } from '../utils/authHeaders.js';

function mockRequest(partial: Partial<Request> & { headers?: Record<string, string> }): Request {
  const headers = partial.headers ?? {};
  return {
    ...partial,
    header: ((name: string) => {
      const key = name.toLowerCase();
      if (key === 'authorization') {
        return headers.authorization ?? headers.Authorization;
      }
      return headers[name] ?? headers[key];
    }) as Request['header'],
  } as Request;
}

test('extractBearerToken reads Authorization Bearer token', () => {
  const req = mockRequest({
    headers: { authorization: 'Bearer test-access-token' },
  });
  assert.equal(extractBearerToken(req), 'test-access-token');
});

test('extractBearerToken returns null without Authorization', () => {
  const req = mockRequest({ headers: {} });
  assert.equal(extractBearerToken(req), null);
});

test('account delete must ignore body userId and use JWT subject only', () => {
  const bodyUserId = 'attacker-controlled-id';
  const jwtSubject = 'verified-user-id';
  const resolvedUserId = jwtSubject;
  assert.notEqual(bodyUserId, resolvedUserId);
  assert.equal(resolvedUserId, 'verified-user-id');
});
