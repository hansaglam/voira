import fs from 'node:fs/promises';
import path from 'node:path';
import '../src/config.js';
import { transcribeAudio } from '../src/services/speechToTextService.js';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npm run test:transcription -- <path-to-audio.m4a|.mp3>');
  process.exit(1);
}

const resolvedPath = path.resolve(filePath);
const buffer = await fs.readFile(resolvedPath);
const originalname = path.basename(resolvedPath);
const ext = path.extname(originalname).toLowerCase();
const mimetype =
  ext === '.mp3'
    ? 'audio/mpeg'
    : ext === '.wav'
      ? 'audio/wav'
      : 'audio/m4a';

const result = await transcribeAudio({
  buffer,
  originalname,
  mimetype,
  size: buffer.length,
});

console.log('[EchoSpeak STT Test]', {
  ok: result.ok,
  transcriptLength: result.transcript?.length ?? 0,
  errorCode: result.errorCode,
});

if (result.transcript) {
  console.log('[EchoSpeak STT Test] transcript:', result.transcript);
}

if (!result.ok) {
  process.exit(1);
}
