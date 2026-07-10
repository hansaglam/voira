import fs from 'node:fs/promises';
import path from 'node:path';
import { AUDIO_REGISTRY_PATH, LESSON_AUDIO_UPLOAD_ROOT } from '../config.js';
import { uploadLessonAudioToSupabase } from '../services/audio/audioStorageService.js';
import {
  isSupabaseAdminConfigured,
  logSupabaseAdminStartupStatus,
} from '../services/supabase/supabaseAdminClient.js';
import type { LessonAudioRegistry, LessonAudioType } from '../types/audioRegistry.js';

const LOG_PREFIX = '[EchoSpeak Audio Migration]';

const AUDIO_TYPES: LessonAudioType[] = ['natural', 'slow', 'native'];

const URL_FIELD_BY_TYPE: Record<LessonAudioType, 'naturalAudioUrl' | 'slowAudioUrl' | 'nativeAudioUrl'> = {
  natural: 'naturalAudioUrl',
  slow: 'slowAudioUrl',
  native: 'nativeAudioUrl',
};

function extractLocalRelativePath(audioUrl: string): string | null {
  const marker = '/uploads/audio/lessons/';
  const markerIndex = audioUrl.indexOf(marker);
  if (markerIndex >= 0) {
    return audioUrl.slice(markerIndex + marker.length);
  }

  try {
    const parsed = new URL(audioUrl);
    const pathnameMarker = '/uploads/audio/lessons/';
    const pathnameIndex = parsed.pathname.indexOf(pathnameMarker);
    if (pathnameIndex >= 0) {
      return parsed.pathname.slice(pathnameIndex + pathnameMarker.length);
    }
  } catch {
    return null;
  }

  return null;
}

function guessMimeType(relativePath: string): string {
  const ext = path.extname(relativePath).toLowerCase();
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.m4a') return 'audio/m4a';
  if (ext === '.mp4') return 'audio/mp4';
  return 'audio/mpeg';
}

async function main(): Promise<void> {
  logSupabaseAdminStartupStatus();

  if (!isSupabaseAdminConfigured()) {
    console.error(`${LOG_PREFIX} Supabase admin is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`);
    process.exitCode = 1;
    return;
  }

  let registry: LessonAudioRegistry;
  try {
    const raw = await fs.readFile(AUDIO_REGISTRY_PATH, 'utf8');
    registry = JSON.parse(raw) as LessonAudioRegistry;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to read registry at ${AUDIO_REGISTRY_PATH}`, error);
    process.exitCode = 1;
    return;
  }

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const [lessonId, segments] of Object.entries(registry)) {
    for (const [segmentId, entry] of Object.entries(segments)) {
      for (const audioType of AUDIO_TYPES) {
        const field = URL_FIELD_BY_TYPE[audioType];
        const audioUrl = entry[field];
        if (!audioUrl) {
          continue;
        }

        const relativePath = extractLocalRelativePath(audioUrl);
        if (!relativePath) {
          console.warn(`${LOG_PREFIX} skip non-local URL`, { lessonId, segmentId, audioType, audioUrl });
          skippedCount += 1;
          continue;
        }

        const absolutePath = path.join(LESSON_AUDIO_UPLOAD_ROOT, ...relativePath.split('/'));
        let fileBuffer: Buffer;
        try {
          fileBuffer = await fs.readFile(absolutePath);
        } catch {
          console.warn(`${LOG_PREFIX} missing local file`, { lessonId, segmentId, audioType, absolutePath });
          skippedCount += 1;
          continue;
        }

        try {
          const result = await uploadLessonAudioToSupabase({
            lessonId,
            segmentId,
            audioType,
            fileBuffer,
            originalFilename: path.basename(relativePath),
            mimeType: guessMimeType(relativePath),
          });

          console.log(`${LOG_PREFIX} uploaded`, {
            lessonId,
            segmentId,
            audioType,
            storagePath: result.storagePath,
            audioUrl: result.audioUrl,
          });
          successCount += 1;
        } catch (error) {
          console.error(`${LOG_PREFIX} failed`, {
            lessonId,
            segmentId,
            audioType,
            message: error instanceof Error ? error.message : 'unknown',
          });
          failedCount += 1;
        }
      }
    }
  }

  console.log(`${LOG_PREFIX} complete`, {
    successCount,
    skippedCount,
    failedCount,
  });

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

void main();
