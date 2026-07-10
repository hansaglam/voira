import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ffmpegStaticImport from 'ffmpeg-static';

const ffmpegStaticPath = typeof ffmpegStaticImport === 'string'
  ? ffmpegStaticImport
  : null;

export interface WavPcmInfo {
  pcmBuffer: Buffer;
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
}

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
  if (!isWavBuffer(buffer) || buffer.length < 44) {
    return null;
  }

  let offset = 12;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let channels = 1;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === 'fmt ') {
      if (chunkStart + 16 > buffer.length) return null;
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === 'data') {
      dataOffset = chunkStart;
      dataSize = chunkSize;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0 || dataSize <= 0 || dataOffset + dataSize > buffer.length) {
    return null;
  }

  return {
    pcmBuffer: buffer.subarray(dataOffset, dataOffset + dataSize),
    sampleRate,
    bitsPerSample,
    channels,
  };
}

async function convertToWavWithFfmpeg(input: Buffer, extension: string): Promise<Buffer | null> {
  if (!ffmpegStaticPath) {
    return null;
  }

  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `echospeak-${randomUUID()}.${extension}`);
  const outputPath = path.join(tempDir, `echospeak-${randomUUID()}.wav`);

  try {
    await writeFile(inputPath, input);

    await new Promise<void>((resolve, reject) => {
      const process = spawn(ffmpegStaticPath, [
        '-y',
        '-i',
        inputPath,
        '-ac',
        '1',
        '-ar',
        '16000',
        '-f',
        'wav',
        outputPath,
      ]);

      let stderr = '';
      process.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      process.on('error', reject);
      process.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(stderr || `ffmpeg exited with code ${code ?? 'unknown'}`));
      });
    });

    const { readFile } = await import('node:fs/promises');
    return await readFile(outputPath);
  } catch {
    return null;
  } finally {
    await Promise.all([
      unlink(inputPath).catch(() => undefined),
      unlink(outputPath).catch(() => undefined),
    ]);
  }
}

export async function prepareAzurePcmAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<WavPcmInfo | null> {
  const wavFromInput = parseWavPcm(audioBuffer);
  if (wavFromInput) {
    return wavFromInput;
  }

  const extension = extensionFromMimeType(mimeType);
  const convertedWav = await convertToWavWithFfmpeg(audioBuffer, extension);
  if (!convertedWav) {
    return null;
  }

  return parseWavPcm(convertedWav);
}
