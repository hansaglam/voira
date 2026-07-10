import {
  ALLOW_FAKE_TRANSCRIPT_FROM_TARGET,
  ENABLE_DEMO_ANALYSIS,
} from '../../config/analysisConfig';
import { generateMockUserTranscript } from '../ai/mockSpeechAnalysisService';
import {
  AudioAnalysisInput,
  MIN_AUDIO_ANALYSIS_DURATION_MS,
  MockTranscriptionResult,
} from './audioAnalysisTypes';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function emptyTranscription(): MockTranscriptionResult {
  return {
    transcript: '',
    confidence: 0,
    language: 'en',
    detectedWords: [],
  };
}

function buildPartialDevTranscript(targetText: string, seed: number): MockTranscriptionResult {
  const targetWords = tokenize(targetText);
  if (targetWords.length === 0) {
    return emptyTranscription();
  }

  const maxWords = Math.max(2, Math.floor(targetWords.length * 0.55));
  const minWords = Math.min(2, targetWords.length);
  const wordCount = Math.min(
    targetWords.length,
    Math.max(minWords, maxWords - (seed % 2)),
  );
  const detectedWords = targetWords.slice(0, wordCount);
  const confidence = 0.55 + (seed % 16) / 100;

  return {
    transcript: detectedWords.join(' '),
    confidence,
    language: 'en',
    detectedWords,
  };
}

/**
 * Simulates speech-to-text from a recorded audio file.
 * Never infers the full target sentence unless explicit demo mode is enabled.
 */
export async function mockTranscribeAudio(
  input: AudioAnalysisInput,
): Promise<MockTranscriptionResult> {
  if (!input.audioUri?.trim() || input.hasSpeech === false) {
    return emptyTranscription();
  }

  const durationMillis = input.durationMillis ?? 0;
  if (durationMillis < MIN_AUDIO_ANALYSIS_DURATION_MS) {
    return emptyTranscription();
  }

  if (input.recordingValidation && !input.recordingValidation.hasSpeech) {
    return emptyTranscription();
  }

  const seed = hashSeed(`${input.lessonId}:${input.audioUri}:${input.segmentId}`);

  if (ENABLE_DEMO_ANALYSIS && ALLOW_FAKE_TRANSCRIPT_FROM_TARGET) {
    const transcript = generateMockUserTranscript(input.targetText, input.lessonId);
    const detectedWords = tokenize(transcript);
    return {
      transcript,
      confidence: Math.min(0.82, 0.62 + (seed % 18) / 100),
      language: 'en',
      detectedWords,
    };
  }

  return buildPartialDevTranscript(input.targetText, seed);
}
