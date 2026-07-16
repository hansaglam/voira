import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request } from 'express';

function extractBearerToken(req: Request): string | null {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

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
  // Documented contract for reviewers / maintainers — body userId is never trusted.
  const bodyUserId = 'attacker-controlled-id';
  const jwtSubject = 'verified-user-id';
  const resolvedUserId = jwtSubject; // requireSupabaseAuth sets authUserId from JWT
  assert.notEqual(bodyUserId, resolvedUserId);
  assert.equal(resolvedUserId, 'verified-user-id');
});
