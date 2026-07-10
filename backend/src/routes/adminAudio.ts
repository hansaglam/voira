import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { IS_DEV, MAX_LESSON_AUDIO_UPLOAD_BYTES } from '../config.js';
import { requireAdminAccess } from '../middleware/adminAuth.js';
import { getAudioStorageProvider } from '../services/audio/audioRegistryRepository.js';
import { uploadLessonAudio } from '../services/audio/audioStorageService.js';
import { readLessonCatalogSnapshot } from '../services/lessonCatalogService.js';
import type { LessonAudioType } from '../types/audioRegistry.js';
import { failed, sendFailed } from '../utils/response.js';

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/mp4',
]);

const ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.wav', '.mp4']);

function isAllowedAudioUpload(originalName: string, mimeType: string): boolean {
  if (ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
    return true;
  }

  const extension = path.extname(originalName).toLowerCase();
  if (!ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    return false;
  }

  return mimeType === 'application/octet-stream' || mimeType === '';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LESSON_AUDIO_UPLOAD_BYTES },
});

export const adminAudioRouter = Router();

function isLessonAudioType(value: unknown): value is LessonAudioType {
  return value === 'natural' || value === 'slow' || value === 'native';
}

adminAudioRouter.get('/admin/audio/status', requireAdminAccess, (_req, res) => {
  const provider = getAudioStorageProvider();
  return res.status(200).json({
    ok: true,
    storageProvider: provider,
    storageLabel: provider === 'supabase' ? 'Supabase' : 'Local fallback',
  });
});

adminAudioRouter.get('/admin/audio/catalog', requireAdminAccess, async (_req, res) => {
  try {
    const lessons = await readLessonCatalogSnapshot();
    const segmentCount = lessons.reduce((total, lesson) => total + lesson.segments.length, 0);

    if (IS_DEV) {
      console.log('[EchoSpeak Admin Audio] catalog lessons:', lessons.length, 'segments:', segmentCount);
    }

    return res.status(200).json({ ok: true, lessons });
  } catch (error) {
    if (IS_DEV) {
      console.error('[EchoSpeak Admin Audio] catalog_read_error', {
        message: error instanceof Error ? error.message : 'unknown',
      });
    }

    return sendFailed(res, 500, failed(
      'catalog_read_failed',
      'Ders listesi okunamadı.',
    ));
  }
});

adminAudioRouter.post(
  '/admin/audio/upload',
  requireAdminAccess,
  upload.single('audio'),
  async (req, res) => {
    try {
      const audioFile = req.file;
      const lessonId = typeof req.body?.lessonId === 'string' ? req.body.lessonId.trim() : '';
      const segmentId = typeof req.body?.segmentId === 'string' ? req.body.segmentId.trim() : '';
      const audioTypeRaw = typeof req.body?.audioType === 'string' ? req.body.audioType.trim() : '';

      if (!audioFile || audioFile.size === 0) {
        return sendFailed(res, 400, failed(
          'missing_audio',
          'Ses dosyası alınamadı.',
        ));
      }

      if (!lessonId) {
        return sendFailed(res, 400, failed(
          'missing_lesson_id',
          'lessonId gerekli.',
        ));
      }

      if (!segmentId) {
        return sendFailed(res, 400, failed(
          'missing_segment_id',
          'segmentId gerekli.',
        ));
      }

      if (!isLessonAudioType(audioTypeRaw)) {
        return sendFailed(res, 400, failed(
          'invalid_audio_type',
          'audioType natural, slow veya native olmalı.',
        ));
      }

      if (audioFile.size > MAX_LESSON_AUDIO_UPLOAD_BYTES) {
        return sendFailed(res, 400, failed(
          'file_too_large',
          'Ses dosyası çok büyük. En fazla 10 MB yükleyebilirsin.',
        ));
      }

      const mimeType = audioFile.mimetype || 'audio/mpeg';
      if (!isAllowedAudioUpload(audioFile.originalname, mimeType)) {
        return sendFailed(res, 400, failed(
          'invalid_audio_format',
          'Desteklenmeyen ses formatı. MP3, M4A veya WAV kullan.',
        ));
      }

      const requestHost = req.get('host') ?? undefined;
      const uploadResult = await uploadLessonAudio({
        lessonId,
        segmentId,
        audioType: audioTypeRaw,
        fileBuffer: audioFile.buffer,
        originalFilename: audioFile.originalname,
        mimeType,
        requestHost,
      });

      if (IS_DEV) {
        console.log('[EchoSpeak Admin Audio] uploaded', {
          lessonId,
          segmentId,
          audioType: audioTypeRaw,
          audioUrl: uploadResult.audioUrl,
          storagePath: uploadResult.storagePath,
          provider: uploadResult.provider,
        });
      }

      return res.status(200).json({
        ok: true,
        lessonId,
        segmentId,
        audioType: audioTypeRaw,
        audioUrl: uploadResult.audioUrl,
        storagePath: uploadResult.storagePath,
        provider: uploadResult.provider,
      });
    } catch (error) {
      if (IS_DEV) {
        console.error('[EchoSpeak Admin Audio] upload_error', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }

      return sendFailed(res, 500, failed(
        'upload_failed',
        'Ses dosyası yüklenirken bir sorun oluştu.',
      ));
    }
  },
);
