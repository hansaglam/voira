import path from 'node:path';
import {
  buildLessonAudioAbsolutePath,
  buildLessonAudioRelativePath,
  buildPublicAudioUrl,
  resolveLessonAudioExtension,
  upsertAudioRegistryEntry,
} from '../audioRegistryService.js';
import {
  getSupabaseAdminClient,
  getSupabaseAudioBucket,
  isSupabaseAdminConfigured,
} from '../supabase/supabaseAdminClient.js';
import { upsertAudioAsset } from './audioRegistryRepository.js';
import type { LessonAudioType } from '../../types/audioRegistry.js';

const LOG_PREFIX = '[EchoSpeak Audio]';

export interface UploadLessonAudioParams {
  lessonId: string;
  segmentId: string;
  audioType: LessonAudioType;
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
  requestHost?: string;
  durationMs?: number;
}

export interface UploadLessonAudioResult {
  storagePath: string;
  audioUrl: string;
  provider: 'supabase' | 'local';
}

function buildSupabaseStoragePath(
  lessonId: string,
  segmentId: string,
  audioType: LessonAudioType,
  extension: string,
): string {
  const relativePath = buildLessonAudioRelativePath(lessonId, segmentId, audioType, extension);
  return path.posix.join('lessons', relativePath);
}

async function uploadLessonAudioLocally(
  params: UploadLessonAudioParams,
): Promise<UploadLessonAudioResult> {
  const fs = await import('node:fs/promises');

  const extension = resolveLessonAudioExtension(params.originalFilename, params.mimeType);
  const relativePath = buildLessonAudioRelativePath(
    params.lessonId,
    params.segmentId,
    params.audioType,
    extension,
  );
  const absolutePath = buildLessonAudioAbsolutePath(relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, params.fileBuffer);

  const audioUrl = buildPublicAudioUrl(relativePath, params.requestHost);

  await upsertAudioRegistryEntry({
    lessonId: params.lessonId,
    segmentId: params.segmentId,
    audioType: params.audioType,
    audioUrl,
  });

  return {
    storagePath: relativePath,
    audioUrl,
    provider: 'local',
  };
}

async function uploadLessonAudioToSupabaseStorage(
  params: UploadLessonAudioParams,
): Promise<UploadLessonAudioResult> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error('supabase_not_configured');
  }

  const bucket = getSupabaseAudioBucket();
  const extension = resolveLessonAudioExtension(params.originalFilename, params.mimeType);
  const storagePath = buildSupabaseStoragePath(
    params.lessonId,
    params.segmentId,
    params.audioType,
    extension,
  );

  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(storagePath, params.fileBuffer, {
      contentType: params.mimeType || 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(storagePath);
  const audioUrl = publicUrlData.publicUrl;

  await upsertAudioAsset({
    lessonId: params.lessonId,
    segmentId: params.segmentId,
    audioType: params.audioType,
    audioUrl,
    storagePath,
    durationMs: params.durationMs,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`${LOG_PREFIX} uploaded to supabase`, {
      lessonId: params.lessonId,
      segmentId: params.segmentId,
      audioType: params.audioType,
      storagePath,
    });
  }

  return {
    storagePath,
    audioUrl,
    provider: 'supabase',
  };
}

export async function uploadLessonAudio(
  params: UploadLessonAudioParams,
): Promise<UploadLessonAudioResult> {
  if (isSupabaseAdminConfigured()) {
    try {
      return await uploadLessonAudioToSupabaseStorage(params);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`${LOG_PREFIX} supabase upload failed, falling back to local`, {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  }

  return uploadLessonAudioLocally(params);
}

export { uploadLessonAudioToSupabaseStorage as uploadLessonAudioToSupabase };
