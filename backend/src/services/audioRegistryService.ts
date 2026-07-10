import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AUDIO_REGISTRY_PATH,
  BACKEND_PUBLIC_URL,
  LESSON_AUDIO_UPLOAD_ROOT,
} from '../config.js';
import type {
  LessonAudioRegistry,
  LessonAudioType,
  SegmentAudioRegistryEntry,
} from '../types/audioRegistry.js';

const AUDIO_TYPE_FIELD: Record<LessonAudioType, keyof SegmentAudioRegistryEntry> = {
  natural: 'naturalAudioUrl',
  slow: 'slowAudioUrl',
  native: 'nativeAudioUrl',
};

function sanitizePathSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
}

export function resolveLessonAudioExtension(originalName: string, mimeType: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.mp3' || ext === '.m4a' || ext === '.wav' || ext === '.mp4') {
    return ext;
  }

  switch (mimeType) {
    case 'audio/mpeg':
    case 'audio/mp3':
      return '.mp3';
    case 'audio/m4a':
      return '.m4a';
    case 'audio/mp4':
      return '.mp4';
    case 'audio/wav':
    case 'audio/x-wav':
      return '.wav';
    default:
      return '.mp3';
  }
}

export function buildLessonAudioRelativePath(
  lessonId: string,
  segmentId: string,
  audioType: LessonAudioType,
  extension: string,
): string {
  const safeLessonId = sanitizePathSegment(lessonId);
  const safeSegmentId = sanitizePathSegment(segmentId);
  const safeAudioType = sanitizePathSegment(audioType);
  const safeExtension = extension.startsWith('.') ? extension : `.${extension}`;

  return path.posix.join(safeLessonId, safeSegmentId, `${safeAudioType}${safeExtension}`);
}

export function buildLessonAudioAbsolutePath(relativePath: string): string {
  return path.join(LESSON_AUDIO_UPLOAD_ROOT, ...relativePath.split('/'));
}

export function buildPublicAudioUrl(relativePath: string, requestHost?: string): string {
  const normalizedPath = `/uploads/audio/lessons/${relativePath.replace(/^\/+/, '')}`;

  if (BACKEND_PUBLIC_URL) {
    return `${BACKEND_PUBLIC_URL}${normalizedPath}`;
  }

  if (requestHost) {
    return `http://${requestHost}${normalizedPath}`;
  }

  return `http://localhost:3001${normalizedPath}`;
}

export async function readAudioRegistry(): Promise<LessonAudioRegistry> {
  try {
    const raw = await fs.readFile(AUDIO_REGISTRY_PATH, 'utf8');
    const parsed = JSON.parse(raw) as LessonAudioRegistry;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeAudioRegistry(registry: LessonAudioRegistry): Promise<void> {
  await fs.mkdir(path.dirname(AUDIO_REGISTRY_PATH), { recursive: true });
  await fs.writeFile(AUDIO_REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

export async function upsertAudioRegistryEntry(input: {
  lessonId: string;
  segmentId: string;
  audioType: LessonAudioType;
  audioUrl: string;
}): Promise<LessonAudioRegistry> {
  const registry = await readAudioRegistry();
  const lessonEntry = registry[input.lessonId] ?? {};
  const segmentEntry = lessonEntry[input.segmentId] ?? {};
  const field = AUDIO_TYPE_FIELD[input.audioType];

  segmentEntry[field] = input.audioUrl;
  if (input.audioType === 'natural' && !segmentEntry.audioUrl) {
    segmentEntry.audioUrl = input.audioUrl;
  }

  lessonEntry[input.segmentId] = segmentEntry;
  registry[input.lessonId] = lessonEntry;

  await writeAudioRegistry(registry);
  return registry;
}
