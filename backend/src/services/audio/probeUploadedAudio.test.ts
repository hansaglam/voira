import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MAX_AUDIO_FILE_BYTES } from '../../config.js';
import { validateUploadedAnalysisAudio } from './probeUploadedAudio.js';

function buildWavBuffer(sampleCount = 160): Buffer {
  const sampleRate = 16000;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = sampleCount * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

describe('probeUploadedAudio', () => {
  test('validateUploadedAnalysisAudio accepts short wav within limits', async () => {
    const buffer = buildWavBuffer(20_000);
    const result = await validateUploadedAnalysisAudio({
      buffer,
      mimeType: 'audio/wav',
      originalname: 'recording.wav',
      fileSizeBytes: buffer.length,
      maxFileBytes: MAX_AUDIO_FILE_BYTES,
      isAllowedFormat: true,
      clientDurationMs: 60_000,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.durationMs >= 100);
      assert.ok(result.durationMs < 5000);
    }
  });

  test('validateUploadedAnalysisAudio rejects empty audio', async () => {
    const result = await validateUploadedAnalysisAudio({
      buffer: Buffer.alloc(0),
      mimeType: 'audio/wav',
      originalname: 'recording.wav',
      fileSizeBytes: 0,
      maxFileBytes: MAX_AUDIO_FILE_BYTES,
      isAllowedFormat: true,
    });

    assert.deepEqual(result, { ok: false, errorCode: 'missing_audio' });
  });

  test('validateUploadedAnalysisAudio rejects oversized files before probe', async () => {
    const buffer = buildWavBuffer(3200);
    const result = await validateUploadedAnalysisAudio({
      buffer,
      mimeType: 'audio/wav',
      originalname: 'recording.wav',
      fileSizeBytes: MAX_AUDIO_FILE_BYTES + 1,
      maxFileBytes: MAX_AUDIO_FILE_BYTES,
      isAllowedFormat: true,
    });

    assert.deepEqual(result, { ok: false, errorCode: 'file_too_large' });
  });

  test('validateUploadedAnalysisAudio rejects unsupported format', async () => {
    const buffer = buildWavBuffer(3200);
    const result = await validateUploadedAnalysisAudio({
      buffer,
      mimeType: 'application/octet-stream',
      originalname: 'recording.bin',
      fileSizeBytes: buffer.length,
      maxFileBytes: MAX_AUDIO_FILE_BYTES,
      isAllowedFormat: false,
    });

    assert.deepEqual(result, { ok: false, errorCode: 'unsupported_audio_format' });
  });
});
