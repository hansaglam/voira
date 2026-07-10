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

export const MIN_RECORDING_DURATION_MS = 1200;
export const MAX_AUDIO_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_LESSON_AUDIO_UPLOAD_BYTES = 10 * 1024 * 1024;

export const UPLOADS_ROOT = path.join(BACKEND_ROOT, 'uploads');
export const LESSON_AUDIO_UPLOAD_ROOT = path.join(UPLOADS_ROOT, 'audio', 'lessons');
export const AUDIO_REGISTRY_PATH = path.join(BACKEND_ROOT, 'data', 'audioRegistry.json');
export const LESSON_CATALOG_SNAPSHOT_PATH = path.join(BACKEND_ROOT, 'data', 'lessonCatalogSnapshot.json');

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
  assertAdminSecretForProduction({ isDev: IS_DEV, adminSecret: ADMIN_SECRET });
}
