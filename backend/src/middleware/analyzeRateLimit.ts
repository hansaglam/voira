import rateLimit from 'express-rate-limit';
import { ANALYZE_RATE_LIMIT_PER_MINUTE } from '../config.js';

export const analyzeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: ANALYZE_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      ok: false,
      errorCode: 'rate_limited',
      messageTr: 'Çok fazla analiz isteği gönderildi. Lütfen biraz sonra tekrar dene.',
    });
  },
});
