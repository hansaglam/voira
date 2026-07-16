import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAuthenticatedUserId,
  requireSupabaseAuth,
  type AuthenticatedRequest,
} from '../middleware/requireSupabaseAuth.js';
import { deleteAuthenticatedAccount } from '../services/accountDeletionService.js';
import { failed, sendFailed } from '../utils/response.js';

const accountDeleteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      ok: false,
      errorCode: 'rate_limited',
      messageTr: 'Çok fazla hesap silme denemesi yapıldı. Lütfen biraz sonra tekrar dene.',
    });
  },
});

export const accountDeleteRouter = Router();

/**
 * POST /api/account/delete
 *
 * Requires Authorization: Bearer <Supabase access token>.
 * Deletes the authenticated Supabase Auth user via the service-role admin API.
 * Ignores any userId in the request body — identity comes only from the JWT.
 */
accountDeleteRouter.post(
  '/account/delete',
  accountDeleteRateLimit,
  requireSupabaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendFailed(
        res,
        401,
        failed('unauthorized', 'Bu işlem için giriş yapman gerekiyor.'),
      );
    }

    const result = await deleteAuthenticatedAccount(userId);
    if (!result.ok) {
      const status =
        result.errorCode === 'unauthorized' || result.errorCode === 'reauth_required'
          ? 401
          : result.errorCode === 'auth_unavailable'
            ? 503
            : 500;
      return sendFailed(res, status, failed(result.errorCode, result.messageTr));
    }

    return res.status(200).json({
      ok: true,
      deleted: true,
      messageTr: 'Hesabın silindi.',
    });
  },
);
