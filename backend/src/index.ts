import express from 'express';
import multer from 'multer';
import path from 'node:path';
import {
  ADMIN_SECRET,
  ALLOWED_ORIGINS,
  ANALYZE_RATE_LIMIT_PER_MINUTE,
  BACKEND_PUBLIC_URL,
  IS_DEV,
  OPENAI_API_KEY,
  PORT,
  UPLOADS_ROOT,
  validateProductionConfig,
} from './config.js';
import { warnIfAdminSecretMissingInDev } from './middleware/adminAuth.js';
import { corsMiddleware } from './middleware/cors.js';
import { adminAudioRouter } from './routes/adminAudio.js';
import { adminAudioPageRouter } from './routes/adminAudioPage.js';
import { analyzeSpeechRouter } from './routes/analyzeSpeech.js';
import { audioRegistryRouter } from './routes/audioRegistry.js';
import {
  isSupabaseAdminConfigured,
  logSupabaseAdminStartupStatus,
} from './services/supabase/supabaseAdminClient.js';
import { failed, sendFailed } from './utils/response.js';

validateProductionConfig();
warnIfAdminSecretMissingInDev();
logSupabaseAdminStartupStatus();

const app = express();

if (!IS_DEV) {
  app.set('trust proxy', 1);
}

app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  if (IS_DEV) {
    console.log('[EchoSpeak Backend Request]', req.method, req.url);
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'EchoSpeak backend',
    hasOpenAIKey: Boolean(OPENAI_API_KEY),
    hasSupabase: isSupabaseAdminConfigured(),
  });
});

app.use(
  '/uploads',
  express.static(UPLOADS_ROOT, {
    fallthrough: true,
    index: false,
    dotfiles: 'deny',
  }),
);

app.use('/api', analyzeSpeechRouter);
app.use('/api', adminAudioRouter);
app.use('/api', audioRegistryRouter);
app.use(adminAudioPageRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return sendFailed(res, 400, failed(
        'file_too_large',
        'Ses dosyası çok büyük. Lütfen daha kısa bir kayıt dene.',
      ));
    }
    return next(err);
  },
);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (IS_DEV) {
      console.error('[EchoSpeak API] unhandled_error', err);
    }
    res.status(500).json({
      ok: false,
      errorCode: 'server_error',
      messageTr: 'Analiz hazırlanırken bir sorun oluştu. Lütfen tekrar dene.',
    });
  },
);

app.listen(PORT, '0.0.0.0', () => {
  const publicBaseUrl = BACKEND_PUBLIC_URL || `http://localhost:${PORT}`;

  console.log('[EchoSpeak Backend Config]', {
    nodeEnv: IS_DEV ? 'development' : 'production',
    hasOpenAIKey: Boolean(OPENAI_API_KEY),
    hasAdminSecret: Boolean(ADMIN_SECRET),
    hasSupabase: isSupabaseAdminConfigured(),
    allowedOriginsCount: ALLOWED_ORIGINS.length,
    analyzeRateLimitPerMinute: ANALYZE_RATE_LIMIT_PER_MINUTE,
    port: PORT,
    publicBaseUrl,
    uploadsRoot: path.basename(UPLOADS_ROOT),
  });

  console.log(`EchoSpeak backend listening on http://0.0.0.0:${PORT}`);
  console.log(`Health check: ${publicBaseUrl}/health`);
  console.log(`Analyze endpoint: ${publicBaseUrl}/api/analyze-speech`);
  console.log(`Audio registry: ${publicBaseUrl}/api/audio/registry`);
  console.log(`Audio admin panel: ${publicBaseUrl}/admin/audio`);
});
