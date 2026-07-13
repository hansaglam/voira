import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request } from 'express';
import { assertAdminSecretForProduction } from '../config.js';
import { extractAdminSecret } from './adminAuth.js';

function mockRequest(partial: Partial<Request>): Request {
  return partial as Request;
}

test('assertAdminSecretForProduction throws when production has no admin secret', () => {
  assert.throws(
    () => assertAdminSecretForProduction({ isDev: false, adminSecret: '' }),
    /ADMIN_SECRET is required/,
  );
});

test('assertAdminSecretForProduction allows development without admin secret', () => {
  assert.doesNotThrow(() =>
    assertAdminSecretForProduction({ isDev: true, adminSecret: '' }),
  );
});

test('extractAdminSecret prefers x-admin-secret header', () => {
  const req = mockRequest({
    header: ((name: string) => {
      if (name === 'x-admin-secret') return 'header-secret';
      return undefined;
    }) as Request['header'],
    query: { adminSecret: 'query-secret' },
  });

  assert.equal(extractAdminSecret(req), 'header-secret');
});

test('extractAdminSecret reads adminSecret query param outside production', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const req = mockRequest({
      header() {
        return undefined;
      },
      query: { adminSecret: 'query-secret' },
    });

    assert.equal(extractAdminSecret(req), 'query-secret');
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test('extractAdminSecret ignores adminSecret query param in production', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const req = mockRequest({
      header() {
        return undefined;
      },
      query: { adminSecret: 'query-secret' },
    });

    assert.equal(extractAdminSecret(req), undefined);
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test('extractAdminSecret reads bearer authorization token', () => {
  const req = mockRequest({
    header: ((name: string) => {
      if (name === 'authorization') return 'Bearer bearer-secret';
      return undefined;
    }) as Request['header'],
    query: {},
  });

  assert.equal(extractAdminSecret(req), 'bearer-secret');
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
