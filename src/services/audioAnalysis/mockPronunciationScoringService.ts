import { Lesson } from '../../types/lesson';
import { LessonSegment } from '../../types/segment';
import { UserLearningProfile } from '../../types/learning';
import { analyzeSpeechMock } from '../ai/mockSpeechAnalysisService';
import { AiAnalysisMode } from '../ai/aiTypes';
import { AudioAnalysisInput, PronunciationScoringResult } from './audioAnalysisTypes';

export const INSUFFICIENT_SPEECH_COACH_TR =
  'Sesini yeterince algılayamadık. Cümleyi biraz daha uzun ve net söyleyerek tekrar dene.';

export const INSUFFICIENT_SPEECH_FOCUS_TR =
  'Tekrar kayıt alırken cümleyi baştan sona söylemeye odaklan.';

const LOW_CONFIDENCE_THRESHOLD = 0.5;

export interface MockPronunciationScoringParams {
  targetText: string;
  transcript: string;
  confidence?: number;
  input: AudioAnalysisInput;
  lesson?: Lesson;
  segment?: LessonSegment;
  userProfile?: UserLearningProfile;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildInsufficientSpeechResult(
  targetText: string,
  weakAreaLabel: string,
): PronunciationScoringResult {
  const targetWords = tokenize(targetText);

  return {
    pronunciationScore: 12,
    fluencyScore: 10,
    rhythmScore: 8,
    confidenceScore: 6,
    nativeScore: 9,
    correctWords: [],
    missingWords: targetWords.slice(0, 5),
    wordsToImprove: targetWords.slice(0, Math.min(5, targetWords.length)),
    weakAreasDetected: [weakAreaLabel],
  };
}

function resolveWeakAreaLabel(
  transcript: string,
  confidence: number,
  durationMillis: number,
): string {
  if (!transcript.trim() || confidence <= 0) {
    return 'Ses algılanamadı';
  }
  if (confidence < LOW_CONFIDENCE_THRESHOLD || durationMillis < 2000) {
    return 'Kısa kayıt';
  }
  return 'Ses algılanamadı';
}

/**
 * Scores pronunciation by comparing target text with mock transcript.
 * Reuses existing mock AI scoring logic — no real audio scoring yet.
 */
export async function mockScorePronunciation(
  params: MockPronunciationScoringParams,
): Promise<PronunciationScoringResult> {
  const { targetText, transcript, input, lesson, segment, userProfile } = params;
  const confidence = params.confidence ?? 0;
  const durationMillis = input.durationMillis ?? 0;

  if (!transcript.trim() || confidence < LOW_CONFIDENCE_THRESHOLD) {
    return buildInsufficientSpeechResult(
      targetText,
      resolveWeakAreaLabel(transcript, confidence, durationMillis),
    );
  }

  if (lesson && segment && userProfile) {
    const output = analyzeSpeechMock({
      targetText,
      userTranscript: transcript,
      lesson,
      segment,
      userProfile,
      audioUri: input.audioUri,
      mode: input.mode as AiAnalysisMode,
    });

    return {
      pronunciationScore: output.pronunciationScore,
      fluencyScore: output.fluencyScore,
      rhythmScore: output.rhythmScore,
      confidenceScore: output.confidenceScore,
      nativeScore: output.nativeScore,
      correctWords: output.correctWords,
      missingWords: output.missingWords,
      wordsToImprove: output.wordsToImprove,
      weakAreasDetected: output.weakAreasDetected,
    };
  }

  const targetWords = tokenize(targetText);
  const transcriptWords = new Set(tokenize(transcript));
  const correctWords = targetWords.filter((w) => transcriptWords.has(w));
  const missingWords = targetWords.filter((w) => !transcriptWords.has(w));
  const matchRatio = targetWords.length === 0 ? 1 : correctWords.length / targetWords.length;
  const base = Math.round(52 + matchRatio * 38);

  return {
    pronunciationScore: base,
    fluencyScore: Math.max(48, base - 4),
    rhythmScore: Math.max(48, base - 2),
    confidenceScore: Math.max(48, base - 6),
    nativeScore: Math.round(base * 0.97),
    correctWords: correctWords.slice(0, 4),
    missingWords: missingWords.slice(0, 4),
    wordsToImprove: missingWords.slice(0, 3),
    weakAreasDetected: matchRatio < 0.7 ? ['Akıcılık'] : [],
  };
}
