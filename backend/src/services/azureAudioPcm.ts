import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ffmpegStaticImport from 'ffmpeg-static';

const ffmpegStaticPath = typeof ffmpegStaticImport === 'string'
  ? ffmpegStaticImport
  : null;

const TARGET_SAMPLE_RATE = 16000;
const TARGET_CHANNELS = 1;
const TARGET_BITS_PER_SAMPLE = 16;

export function isFfmpegAvailable(): boolean {
  return Boolean(ffmpegStaticPath);
}

export interface WavPcmInfo {
  pcmBuffer: Buffer;
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
}

export interface WavFormatInfo {
  valid: boolean;
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
  dataSize: number;
  format: 'wav';
  audioFormat: number;
}

export type AzureWavPrepareResult =
  | {
      ok: true;
      wavFilePath: string;
      wavBuffer: Buffer;
      sampleRate: number;
      bitsPerSample: number;
      channels: number;
      format: 'wav';
    }
  | {
      ok: false;
      errorCode: string;
      message?: string;
      stderr?: string;
    };

function extensionFromMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(';')[0]?.trim() ?? '';

  switch (normalized) {
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
    case 'audio/3gpp':
      return '3gp';
    default:
      return 'm4a';
  }
}

function isWavBuffer(buffer: Buffer): boolean {
  return buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WAVE';
}

export function parseWavPcm(buffer: Buffer): WavPcmInfo | null {
  const format = describeWavFormat(buffer);
  if (!format || format.dataSize <= 0) {
    return null;
  }

  let dataOffset = -1;
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === 'data') {
      dataOffset = chunkStart;
      break;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0 || dataOffset + format.dataSize > buffer.length) {
    return null;
  }

  return {
    pcmBuffer: buffer.subarray(dataOffset, dataOffset + format.dataSize),
    sampleRate: format.sampleRate,
    bitsPerSample: format.bitsPerSample,
    channels: format.channels,
  };
}

export function describeWavFormat(buffer: Buffer): WavFormatInfo | null {
  if (!isWavBuffer(buffer) || buffer.length < 44) {
    return null;
  }

  let offset = 12;
  let sampleRate = TARGET_SAMPLE_RATE;
  let bitsPerSample = TARGET_BITS_PER_SAMPLE;
  let channels = TARGET_CHANNELS;
  let dataSize = 0;
  let audioFormat = 1;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === 'fmt ') {
      if (chunkStart + 16 > buffer.length) return null;
      audioFormat = buffer.readUInt16LE(chunkStart);
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  const valid =
    audioFormat === 1 &&
    sampleRate === TARGET_SAMPLE_RATE &&
    channels === TARGET_CHANNELS &&
    bitsPerSample === TARGET_BITS_PER_SAMPLE &&
    dataSize > 0;

  return {
    valid,
    sampleRate,
    bitsPerSample,
    channels,
    dataSize,
    format: 'wav',
    audioFormat,
  };
}

export function validateWavForAzure(buffer: Buffer): { valid: boolean; reason?: string; info?: WavFormatInfo } {
  const info = describeWavFormat(buffer);
  if (!info) {
    return { valid: false, reason: 'invalid_wav_output' };
  }

  if (info.audioFormat !== 1) {
    return { valid: false, reason: 'invalid_wav_output', info };
  }

  if (info.sampleRate !== TARGET_SAMPLE_RATE) {
    return { valid: false, reason: 'invalid_wav_output', info };
  }

  if (info.channels !== TARGET_CHANNELS) {
    return { valid: false, reason: 'invalid_wav_output', info };
  }

  if (info.bitsPerSample !== TARGET_BITS_PER_SAMPLE) {
    return { valid: false, reason: 'invalid_wav_output', info };
  }

  if (info.dataSize <= 0) {
    return { valid: false, reason: 'invalid_wav_output', info };
  }

  return { valid: true, info };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function summarizeFfmpegCommand(args: string[]): string {
  return ['ffmpeg', ...args].join(' ');
}

async function convertToWavFile(
  input: Buffer,
  extension: string,
  mimeType: string,
): Promise<
  | { ok: true; wavFilePath: string; wavBuffer: Buffer }
  | { ok: false; errorCode: string; stderr?: string }
> {
  if (!ffmpegStaticPath) {
    return { ok: false, errorCode: 'audio_conversion_failed', stderr: 'ffmpeg binary unavailable' };
  }

  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `echospeak-${randomUUID()}.${extension}`);
  const outputPath = path.join(tempDir, `echospeak-${randomUUID()}.wav`);

  console.log('[EchoSpeak Azure Audio] input', {
    inputPath,
    inputExists: false,
    inputSize: input.length,
    inputExt: extension,
    mimeType,
  });

  console.log('[EchoSpeak Azure Audio] ffmpeg', {
    ffmpegPath: ffmpegStaticPath,
    ffmpegExists: await fileExists(ffmpegStaticPath),
    commandSummary: summarizeFfmpegCommand([
      '-y',
      '-i',
      inputPath,
      '-ac',
      String(TARGET_CHANNELS),
      '-ar',
      String(TARGET_SAMPLE_RATE),
      '-c:a',
      'pcm_s16le',
      '-f',
      'wav',
      outputPath,
    ]),
  });

  try {
    await writeFile(inputPath, input);

    console.log('[EchoSpeak Azure Audio] input', {
      inputPath,
      inputExists: await fileExists(inputPath),
      inputSize: input.length,
      inputExt: extension,
      mimeType,
    });

    const stderr = await new Promise<string>((resolve, reject) => {
      const ffmpegProcess = spawn(ffmpegStaticPath, [
        '-y',
        '-i',
        inputPath,
        '-ac',
        String(TARGET_CHANNELS),
        '-ar',
        String(TARGET_SAMPLE_RATE),
        '-c:a',
        'pcm_s16le',
        '-f',
        'wav',
        outputPath,
      ]);

      let stderrOutput = '';
      ffmpegProcess.stderr?.on('data', (chunk: Buffer) => {
        stderrOutput += chunk.toString();
      });

      ffmpegProcess.on('error', reject);
      ffmpegProcess.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stderrOutput);
          return;
        }

        reject(new Error(stderrOutput || `ffmpeg exited with code ${code ?? 'unknown'}`));
      });
    });

    const { readFile } = await import('node:fs/promises');
    const wavBuffer = await readFile(outputPath);
    const validation = validateWavForAzure(wavBuffer);

    console.log('[EchoSpeak Azure Audio] output', {
      outputPath,
      outputExists: await fileExists(outputPath),
      outputSize: wavBuffer.length,
      sampleRate: validation.info?.sampleRate ?? null,
      channels: validation.info?.channels ?? null,
      bitDepth: validation.info?.bitsPerSample ?? null,
      format: validation.info?.format ?? 'wav',
      stderrBytes: stderr.length,
    });

    if (!validation.valid) {
      await unlink(outputPath).catch(() => undefined);
      return {
        ok: false,
        errorCode: validation.reason ?? 'invalid_wav_output',
        stderr: stderr.slice(-1200),
      };
    }

    return {
      ok: true,
      wavFilePath: outputPath,
      wavBuffer,
    };
  } catch (error) {
    const stderr = error instanceof Error ? error.message : 'unknown';
    console.log('[EchoSpeak Azure Audio] ffmpeg_failed', {
      errorCode: 'audio_conversion_failed',
      stderr: stderr.slice(-1200),
    });
    return {
      ok: false,
      errorCode: 'audio_conversion_failed',
      stderr: stderr.slice(-1200),
    };
  } finally {
    await unlink(inputPath).catch(() => undefined);
  }
}

async function writeTempWavFile(wavBuffer: Buffer): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `echospeak-${randomUUID()}.wav`);
  await writeFile(outputPath, wavBuffer);
  return outputPath;
}

export async function prepareAzureWavAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<AzureWavPrepareResult> {
  const parsedFormat = isWavBuffer(audioBuffer) ? describeWavFormat(audioBuffer) : null;

  if (parsedFormat?.valid) {
    const wavFilePath = await writeTempWavFile(audioBuffer);
    console.log('[EchoSpeak Azure Audio] output', {
      outputPath: wavFilePath,
      outputExists: await fileExists(wavFilePath),
      outputSize: audioBuffer.length,
      sampleRate: parsedFormat.sampleRate,
      channels: parsedFormat.channels,
      bitDepth: parsedFormat.bitsPerSample,
      format: 'wav',
    });

    return {
      ok: true,
      wavFilePath,
      wavBuffer: audioBuffer,
      sampleRate: parsedFormat.sampleRate,
      bitsPerSample: parsedFormat.bitsPerSample,
      channels: parsedFormat.channels,
      format: 'wav',
    };
  }

  const extension = parsedFormat ? 'wav' : extensionFromMimeType(mimeType);
  const converted = await convertToWavFile(audioBuffer, extension, mimeType);
  if (!converted.ok) {
    return {
      ok: false,
      errorCode: converted.errorCode,
      stderr: converted.stderr,
    };
  }

  const validation = validateWavForAzure(converted.wavBuffer);
  if (!validation.valid || !validation.info) {
    await unlink(converted.wavFilePath).catch(() => undefined);
    return {
      ok: false,
      errorCode: validation.reason ?? 'invalid_wav_output',
    };
  }

  return {
    ok: true,
    wavFilePath: converted.wavFilePath,
    wavBuffer: converted.wavBuffer,
    sampleRate: validation.info.sampleRate,
    bitsPerSample: validation.info.bitsPerSample,
    channels: validation.info.channels,
    format: 'wav',
  };
}

/** @deprecated Use prepareAzureWavAudio — kept for tests importing parse helpers. */
export async function prepareAzurePcmAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<WavPcmInfo | null> {
  const prepared = await prepareAzureWavAudio(audioBuffer, mimeType);
  if (!prepared.ok) {
    return null;
  }

  return parseWavPcm(prepared.wavBuffer);
}

export async function cleanupAzureWavFile(wavFilePath?: string | null): Promise<void> {
  if (!wavFilePath) return;
  await unlink(wavFilePath).catch(() => undefined);
}
