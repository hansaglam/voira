import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ffmpegStaticImport from 'ffmpeg-static';
import {
  MAX_ANALYSIS_AUDIO_DURATION_MS,
  MIN_RECORDING_DURATION_MS,
} from '../../config.js';
import { AUDIO_PROBE_TIMEOUT_MS } from '../../config/timeouts.js';
import { isFfmpegAvailable } from '../azureAudioPcm.js';

const ffmpegStaticPath = typeof ffmpegStaticImport === 'string'
  ? ffmpegStaticImport
  : null;

export interface UploadedAudioProbeInput {
  buffer: Buffer;
  mimeType: string;
  originalname: string;
}

export type UploadedAudioValidationResult =
  | {
      ok: true;
      durationMs: number;
      clientDurationMs?: number;
    }
  | {
      ok: false;
      errorCode:
        | 'missing_audio'
        | 'file_too_large'
        | 'unsupported_audio_format'
        | 'audio_unreadable'
        | 'too_short'
        | 'audio_too_long'
        | 'audio_probe_failed';
    };

function extensionFromProbeInput(mimeType: string, originalname: string): string {
  const ext = path.extname(originalname).toLowerCase().replace('.', '');
  if (ext) return ext;

  const normalizedMime = mimeType.toLowerCase().split(';')[0]?.trim() ?? '';
  switch (normalizedMime) {
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3';
    case 'audio/m4a':
    case 'audio/mp4':
    case 'audio/aac':
      return 'm4a';
    case 'audio/webm':
      return 'webm';
    case 'audio/x-caf':
    case 'audio/caf':
      return 'caf';
    default:
      return 'm4a';
  }
}

function parseWavDurationMs(buffer: Buffer): number | null {
  if (buffer.length < 44) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buffer.toString('ascii', 8, 12) !== 'WAVE') return null;

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === 'fmt ' && chunkSize >= 16 && chunkDataStart + 16 <= buffer.length) {
      channels = buffer.readUInt16LE(chunkDataStart + 2);
      sampleRate = buffer.readUInt32LE(chunkDataStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataStart + 14);
    }

    if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }

    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (!sampleRate || !channels || !bitsPerSample || !dataSize) {
    return null;
  }

  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = dataSize / (channels * bytesPerSample);
  if (!Number.isFinite(sampleCount) || sampleCount <= 0) {
    return null;
  }

  return Math.round((sampleCount / sampleRate) * 1000);
}

function parseFfmpegDurationMs(stderr: string): number | null {
  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every(Number.isFinite)) {
    return null;
  }

  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
}

async function probeDurationWithFfmpeg(
  buffer: Buffer,
  extension: string,
): Promise<number | null> {
  if (!ffmpegStaticPath) {
    return null;
  }

  const inputPath = path.join(os.tmpdir(), `voira-probe-${randomUUID()}.${extension}`);

  try {
    await writeFile(inputPath, buffer);

    const stderr = await new Promise<string>((resolve, reject) => {
      const ffmpegProcess = spawn(ffmpegStaticPath, ['-hide_banner', '-i', inputPath, '-f', 'null', '-']);
      let stderrOutput = '';
      const timeout = setTimeout(() => {
        ffmpegProcess.kill('SIGKILL');
        reject(new Error('audio_probe_timeout'));
      }, AUDIO_PROBE_TIMEOUT_MS);

      ffmpegProcess.stderr?.on('data', (chunk: Buffer) => {
        stderrOutput += chunk.toString();
      });

      ffmpegProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      ffmpegProcess.on('close', () => {
        clearTimeout(timeout);
        resolve(stderrOutput);
      });
    });

    return parseFfmpegDurationMs(stderr);
  } finally {
    await unlink(inputPath).catch(() => undefined);
  }
}

export async function probeUploadedAudioDurationMs(
  input: UploadedAudioProbeInput,
): Promise<number | null> {
  const extension = extensionFromProbeInput(input.mimeType, input.originalname);

  if (extension === 'wav' || input.mimeType.toLowerCase().includes('wav')) {
    const wavDuration = parseWavDurationMs(input.buffer);
    if (wavDuration !== null) {
      return wavDuration;
    }
  }

  if (!isFfmpegAvailable()) {
    return null;
  }

  return probeDurationWithFfmpeg(input.buffer, extension);
}

export async function validateUploadedAnalysisAudio(
  input: UploadedAudioProbeInput & {
    fileSizeBytes: number;
    maxFileBytes: number;
    clientDurationMs?: number;
    isAllowedFormat: boolean;
  },
): Promise<UploadedAudioValidationResult> {
  if (!input.buffer || input.buffer.length === 0 || input.fileSizeBytes === 0) {
    return { ok: false, errorCode: 'missing_audio' };
  }

  if (input.fileSizeBytes > input.maxFileBytes) {
    return { ok: false, errorCode: 'file_too_large' };
  }

  if (!input.isAllowedFormat) {
    return { ok: false, errorCode: 'unsupported_audio_format' };
  }

  const durationMs = await probeUploadedAudioDurationMs(input);
  if (durationMs === null) {
    return { ok: false, errorCode: 'audio_unreadable' };
  }

  if (durationMs < MIN_RECORDING_DURATION_MS) {
    return { ok: false, errorCode: 'too_short' };
  }

  if (durationMs > MAX_ANALYSIS_AUDIO_DURATION_MS) {
    return { ok: false, errorCode: 'audio_too_long' };
  }

  return {
    ok: true,
    durationMs,
    clientDurationMs: input.clientDurationMs,
  };
}
