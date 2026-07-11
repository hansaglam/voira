import fs from 'node:fs/promises';
import path from 'node:path';
import '../src/config.js';
import { assessAzurePronunciation } from '../src/services/azurePronunciationAssessmentService.js';

const filePath = process.argv[2];
const referenceText = process.argv.slice(3).join(' ').trim();

if (!filePath || !referenceText) {
  console.error('Usage: npm run test:azure-pronunciation -- <path-to-audio> "<reference text>"');
  process.exit(1);
}

const resolvedPath = path.resolve(filePath);
const buffer = await fs.readFile(resolvedPath);
const ext = path.extname(resolvedPath).toLowerCase();
const mimetype =
  ext === '.mp3'
    ? 'audio/mpeg'
    : ext === '.wav'
      ? 'audio/wav'
      : ext === '.webm'
        ? 'audio/webm'
        : 'audio/m4a';

console.log('[EchoSpeak Azure Pronunciation Test] input', {
  filePath: resolvedPath,
  bytes: buffer.length,
  mimetype,
  referenceTextLength: referenceText.length,
});

const result = await assessAzurePronunciation({
  audioBuffer: buffer,
  mimeType: mimetype,
  referenceText,
  language: 'en-US',
});

console.log('[EchoSpeak Azure Pronunciation Test] result', {
  available: result.available,
  errorCode: result.errorCode ?? null,
  messageTr: result.messageTr ?? null,
  pronunciationScore: result.pronunciationScore,
  accuracyScore: result.accuracyScore,
  fluencyScore: result.fluencyScore,
  completenessScore: result.completenessScore,
  prosodyScore: result.prosodyScore,
  wordCount: result.words.length,
});

if (result.raw) {
  console.log('[EchoSpeak Azure Pronunciation Test] raw', result.raw);
}

process.exit(result.available ? 0 : 1);
