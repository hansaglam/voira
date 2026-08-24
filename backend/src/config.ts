import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(backendRoot, '.env');

dotenv.config({ path: envPath });

export const BACKEND_ROOT = backendRoot;
export const PORT = Number(process.env.PORT ?? 3001);
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const IS_DEV = NODE_ENV !== 'production';

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? '';

export const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL?.trim().replace(/\/$/, '') ?? '';

export const SUPABASE_URL = process.env.SUPABASE_URL?.trim().replace(/\/$/, '') ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
export const SUPABASE_AUDIO_BUCKET =
  process.env.SUPABASE_AUDIO_BUCKET?.trim() || 'lesson-audio';

export const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim() ?? '';

export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin: string) => origin.trim())
  .filter(Boolean);

export const ANALYZE_RATE_LIMIT_PER_MINUTE = Math.max(
  1,
  Number(process.env.ANALYZE_RATE_LIMIT_PER_MINUTE ?? 10) || 10,
);

/** Per-IP analyze cap (defense in depth alongside identity-based limits). */
export const ANALYZE_IP_RATE_LIMIT_PER_MINUTE = Math.max(
  ANALYZE_RATE_LIMIT_PER_MINUTE,
  Number(process.env.ANALYZE_IP_RATE_LIMIT_PER_MINUTE ?? 30) || 30,
);

/** Per-IP cap for legacy clients without modern identity headers (default: 8/min). */
export const LEGACY_ANALYZE_RATE_LIMIT_PER_MINUTE = Math.max(
  1,
  Number(process.env.LEGACY_ANALYZE_RATE_LIMIT_PER_MINUTE ?? 8) || 8,
);

export const GUEST_ID_PREFIX = 'guest-';
export const GUEST_ID_MAX_LENGTH = 128;

export const MIN_RECORDING_DURATION_MS = 1200;
/** Reject analyze requests with durationMillis above this (cost protection). Default 60s. */
export const MAX_ANALYSIS_AUDIO_DURATION_MS = Math.max(
  MIN_RECORDING_DURATION_MS,
  Number(process.env.MAX_ANALYSIS_AUDIO_DURATION_MS ?? 60_000) || 60_000,
);
export const MAX_AUDIO_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_LESSON_AUDIO_UPLOAD_BYTES = 10 * 1024 * 1024;

export const UPLOADS_ROOT = path.join(BACKEND_ROOT, 'uploads');
export const LESSON_AUDIO_UPLOAD_ROOT = path.join(UPLOADS_ROOT, 'audio', 'lessons');
export const AUDIO_REGISTRY_PATH = path.join(BACKEND_ROOT, 'data', 'audioRegistry.json');
export const LESSON_CATALOG_SNAPSHOT_PATH = path.join(BACKEND_ROOT, 'data', 'lessonCatalogSnapshot.json');

import { isAzurePronunciationEnabled } from './services/pronunciationAssessment/pronunciationAssessmentConfig.js';
import { validateLegacyAnalysisConfig } from './config/legacyAnalysisConfig.js';

export function assertAdminSecretForProduction(options: {
  isDev: boolean;
  adminSecret: string;
}): void {
  if (!options.isDev && !options.adminSecret) {
    throw new Error(
      'ADMIN_SECRET is required when NODE_ENV=production. Set ADMIN_SECRET in backend/.env before starting.',
    );
  }
}

export function validateProductionConfig(): void {
  validateLegacyAnalysisConfig();

  const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';

  if (isDev) {
    return;
  }

  const missing: string[] = [];

  if (!(process.env.OPENAI_API_KEY?.trim())) {
    missing.push('OPENAI_API_KEY');
  }

  if (!(process.env.ADMIN_SECRET?.trim())) {
    missing.push('ADMIN_SECRET');
  }

  if (!(process.env.SUPABASE_URL?.trim())) {
    missing.push('SUPABASE_URL');
  }

  if (!(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  if (isAzurePronunciationEnabled()) {
    if (!(process.env.AZURE_SPEECH_KEY?.trim())) {
      missing.push('AZURE_SPEECH_KEY');
    }
    if (!(process.env.AZURE_SPEECH_REGION?.trim())) {
      missing.push('AZURE_SPEECH_REGION');
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}`,
    );
  }
}
