import type { NextFunction, Request, Response } from 'express';
import { ADMIN_SECRET, IS_DEV } from '../config.js';
import { failed, sendFailed } from '../utils/response.js';

const ADMIN_UNAUTHORIZED_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EchoSpeak Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f1020; color: #e5e7eb; margin: 0; min-height: 100vh; display: grid; place-items: center; }
    main { max-width: 420px; padding: 24px; border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 16px; background: rgba(26, 27, 46, 0.95); }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { margin: 0; line-height: 1.5; color: #9ca3af; font-size: 14px; }
    code { color: #c4b5fd; }
  </style>
</head>
<body>
  <main>
    <h1>Yetkisiz erişim</h1>
    <p>Admin erişimi için yetki gerekli.</p>
  </main>
</body>
</html>`;

export function warnIfAdminSecretMissingInDev(): void {
  if (IS_DEV && !ADMIN_SECRET) {
    console.warn(
      '[EchoSpeak Admin] ADMIN_SECRET missing; admin routes are open in development only.',
    );
  }
}

export function extractAdminSecret(req: Request): string | undefined {
  const headerSecret = req.header('x-admin-secret')?.trim();
  if (headerSecret) {
    return headerSecret;
  }

  const querySecret = req.query.adminSecret;
  if (typeof querySecret === 'string' && querySecret.trim()) {
    return querySecret.trim();
  }

  const authorization = req.header('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return undefined;
}

export function isAdminAuthorized(req: Request): boolean {
  if (IS_DEV && !ADMIN_SECRET) {
    return true;
  }

  if (!ADMIN_SECRET) {
    return false;
  }

  return extractAdminSecret(req) === ADMIN_SECRET;
}

export function requireAdminAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isAdminAuthorized(req)) {
    next();
    return;
  }

  sendFailed(res, 401, failed(
    'admin_unauthorized',
    'Admin erişimi için yetki gerekli.',
  ));
}

export function requireAdminPageAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isAdminAuthorized(req)) {
    next();
    return;
  }

  res.status(401).type('html').send(ADMIN_UNAUTHORIZED_HTML);
}
