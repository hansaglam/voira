import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  describeWavFormat,
  validateWavForAzure,
} from './azureAudioPcm.js';

function buildWavBuffer(options?: {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  sampleCount?: number;
}): Buffer {
  const sampleRate = options?.sampleRate ?? 16000;
  const channels = options?.channels ?? 1;
  const bitsPerSample = options?.bitsPerSample ?? 16;
  const sampleCount = options?.sampleCount ?? 160;
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

describe('azureAudioPcm', () => {
  test('validateWavForAzure accepts 16kHz mono pcm_s16le wav', () => {
    const wav = buildWavBuffer();
    const validation = validateWavForAzure(wav);

    assert.equal(validation.valid, true);
    assert.equal(validation.info?.sampleRate, 16000);
    assert.equal(validation.info?.channels, 1);
    assert.equal(validation.info?.bitsPerSample, 16);
  });

  test('validateWavForAzure rejects unsupported sample rate', () => {
    const wav = buildWavBuffer({ sampleRate: 44100 });
    const validation = validateWavForAzure(wav);

    assert.equal(validation.valid, false);
    assert.equal(validation.reason, 'invalid_wav_output');
  });

  test('describeWavFormat returns null for non-wav buffers', () => {
    assert.equal(describeWavFormat(Buffer.from('not-a-wav')), null);
  });
});
