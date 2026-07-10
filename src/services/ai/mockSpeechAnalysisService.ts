import { calculateNativeScore, getRecommendedLessons } from '../../data/learningAlgorithm';
import { contentCatalog } from '../../data/content/contentCatalog';
import { getAllKeywords } from '../../utils/lessonUtils';
import { dedupeStrings } from '../../utils/stringUtils';
import {
  getSafeLessonField,
  normalizeLearningProfile,
  validateLessonForRecommendation,
} from '../../utils/recommendationSafety';
import {
  AiSpeechAnalysisInput,
  AiSpeechAnalysisOutput,
  PronunciationIssue,
  SpeechAnalysisService,
} from './aiTypes';
import { getMatchingFeedbackRules } from './feedbackRules';

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

function seededScore(seed: string, base: number, spread: number): number {
  const n = hashSeed(seed) % spread;
  return Math.min(96, Math.max(48, base + n - Math.floor(spread / 2)));
}

/**
 * Simulates imperfect speech from a Turkish speaker based on target text.
 * Future: replace with real STT output from audioUri.
 */
export function generateMockUserTranscript(targetText: string, lessonId: string): string {
  const tokens = tokenize(targetText);
  const seed = hashSeed(lessonId + targetText);

  const simulated = tokens.map((word, i) => {
    const roll = (seed + i * 17) % 10;
    if (word.includes('th') && roll < 4) return word.replace(/th/g, 't');
    if (word === 'the' && roll < 3) return 'de';
    if (word.includes('going') && roll < 5) return 'gonna';
    if (word.includes('want') && roll < 4) return word.replace('want', 'wanna');
    if (roll < 2) return word;
    return word;
  });

  if (seed % 5 === 0) {
    return simulated.slice(0, -1).join(' ') + '...';
  }

  return simulated.join(' ');
}

function compareWords(
  targetText: string,
  transcript: string,
): { correct: string[]; missing: string[]; improve: string[]; matchRatio: number } {
  const targetTokens = tokenize(targetText);
  const transcriptTokens = new Set(tokenize(transcript));

  const correct: string[] = [];
  const missing: string[] = [];
  const improve: string[] = [];

  targetTokens.forEach((word) => {
    if (transcriptTokens.has(word)) {
      correct.push(word);
    } else {
      const partial = [...transcriptTokens].find(
        (t) => t.startsWith(word.slice(0, 3)) || word.startsWith(t.slice(0, 3)),
      );
      if (partial) {
        improve.push(word);
      } else {
        missing.push(word);
      }
    }
  });

  const matchRatio =
    targetTokens.length === 0 ? 1 : correct.length / targetTokens.length;

  return { correct, missing, improve, matchRatio };
}

function buildCoachComment(
  matchRatio: number,
  rules: ReturnType<typeof getMatchingFeedbackRules>,
  lessonFeedback: string,
): string {
  if (rules.length > 0) {
    const primary = rules[0];
    const prefix =
      matchRatio >= 0.75
        ? 'Genel olarak iyi gidiyorsun. '
        : matchRatio >= 0.5
          ? 'Anlaşılırsın, birkaç noktaya odaklan. '
          : 'Bu deneme zorlayıcıydı ama doğru yoldasın. ';
    return prefix + primary.coachTipTr;
  }

  if (lessonFeedback) return lessonFeedback;

  return matchRatio >= 0.7
    ? 'Ritmi iyi yakaladın. Bir sonraki denemede kelimeleri daha bağlı söyle.'
    : 'Her deneme seni ileri taşır. Önce yavaş, sonra doğal ritimle tekrar et.';
}

function buildNextFocus(
  rules: ReturnType<typeof getMatchingFeedbackRules>,
  segmentFocus: string,
): string {
  if (rules.length > 0) return rules[0].nextFocusTr;
  const focus = getSafeLessonField(segmentFocus, 'Shadowing');
  return `${focus} odağında kal. Cümleyi tek nefeste, bağlı bir ritimle tekrar et.`;
}

function createFallbackMockAnalysis(input: AiSpeechAnalysisInput): AiSpeechAnalysisOutput {
  const safeProfile = normalizeLearningProfile(input.userProfile);
  const targetText = getSafeLessonField(input.targetText || input.segment?.text);
  const transcript =
    getSafeLessonField(input.userTranscript) || generateMockUserTranscript(targetText, input.lesson?.id ?? 'fallback');

  return {
    transcript,
    wordMatchScore: 0,
    analysisMode: 'text_match_only',
    pronunciationAssessmentAvailable: false,
    pronunciationScore: 60,
    fluencyScore: 58,
    rhythmScore: 58,
    confidenceScore: 56,
    nativeScore: 58,
    correctWords: [],
    missingWords: [],
    wordsToImprove: [],
    weakAreasDetected: [],
    pronunciationIssues: [],
    rhythmIssues: [],
    aiCoachCommentTr:
      'Analiz hazırlanırken eksik ders verisi bulundu. Lütfen cümleyi yavaşça tekrar et.',
    nextFocusTr: 'Cümleyi tek nefeste, bağlı bir ritimle tekrar et.',
    recommendedLessonIds: [],
  };
}

/**
 * Mock speech analysis — deterministic, local-only.
 * Future: swap implementation with real API client implementing SpeechAnalysisService.
 */
export function analyzeSpeechMock(input: AiSpeechAnalysisInput): AiSpeechAnalysisOutput {
  try {
    const safeProfile = normalizeLearningProfile(input.userProfile);
    const lessonValidation = validateLessonForRecommendation(input.lesson);
    if (!lessonValidation.valid) {
      if (__DEV__) {
        console.warn('[EchoSpeak Mock Analysis] malformed lesson, using fallback', {
          lessonId: input.lesson?.id,
          reason: lessonValidation.reason,
        });
      }
      return createFallbackMockAnalysis({ ...input, userProfile: safeProfile });
    }

    const { targetText, lesson, segment } = input;
    const transcript =
      input.userTranscript.trim() ||
      generateMockUserTranscript(targetText, lesson.id);

    const { correct, missing, improve, matchRatio } = compareWords(targetText, transcript);
    const keywords = getAllKeywords(lesson);
    const rules = getMatchingFeedbackRules(targetText, transcript, safeProfile.weakAreas);

    const seed = `${lesson.id}:${segment.id}:${input.mode}`;
    const penaltyTotal = Math.min(25, rules.reduce((sum, r) => sum + r.penalty, 0));

    const wordMatchScore = Math.round(matchRatio * 100);
    const pronunciationScore = Math.max(
      45,
      seededScore(`${seed}:p`, 74, 16) - Math.round(penaltyTotal * 0.6),
    );
    const fluencyScore = Math.max(
      45,
      seededScore(`${seed}:f`, 68, 18) -
        Math.round(penaltyTotal * 0.4) -
        (missing.length > 2 ? 8 : 0),
    );
    const rhythmScore = Math.max(
      45,
      seededScore(`${seed}:r`, 71, 16) - (rules.some((r) => r.id === 'rhythm_stress') ? 6 : 0),
    );
    const confidenceScore = seededScore(`${seed}:c`, 70, 14);

    const nativeScore = calculateNativeScore({
      pronunciationScore,
      fluencyScore,
      rhythmScore,
      confidenceScore,
    });

    const correctWords = dedupeStrings(
      correct.length > 0
        ? correct.slice(0, 4).map((w) => keywords.find((k) => k.toLowerCase().includes(w)) ?? w)
        : keywords.slice(0, 2),
    );

    const wordsToImprove = dedupeStrings(
      improve.length > 0
        ? improve.slice(0, 3)
        : missing.length > 0
          ? missing.slice(0, 2)
          : keywords.slice(-1),
    );

    const weakAreasDetected = dedupeStrings([
      ...rules.map((r) => r.weakAreaLabel),
      ...(pronunciationScore < 72 ? ['Telaffuz'] : []),
      ...(fluencyScore < 72 ? ['Akıcılık'] : []),
      ...(rhythmScore < 72 ? ['Ritim'] : []),
    ]).slice(0, 4);

    const pronunciationIssues: PronunciationIssue[] = rules
      .filter((r) => ['th_sound', 'w_v_distinction', 'final_consonants'].includes(r.id))
      .map((r) => {
        let severity: PronunciationIssue['severity'] = 'low';
        if (r.penalty >= 8) severity = 'high';
        else if (r.penalty >= 6) severity = 'medium';
        return {
          id: r.id,
          labelTr: r.labelTr,
          detailTr: r.coachTipTr,
          severity,
        };
      });

    const rhythmIssues = rules
      .filter((r) => ['rhythm_stress', 'word_linking', 'word_by_word', 'fast_reductions'].includes(r.id))
      .map((r) => ({
        id: r.id,
        labelTr: r.labelTr,
        detailTr: r.coachTipTr,
      }));

    let recommended: string[] = [];
    try {
      const catalogLessons = Array.isArray(contentCatalog) ? contentCatalog : [];
      recommended = getRecommendedLessons(safeProfile, catalogLessons, 2)
        .filter((l) => l.id !== lesson.id)
        .map((l) => l.id);
    } catch (error) {
      if (__DEV__) {
        console.warn('[EchoSpeak Mock Analysis] recommendation lookup failed', {
          lessonId: lesson.id,
          reason: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    return {
      transcript,
      wordMatchScore,
      pronunciationScore,
      fluencyScore,
      rhythmScore,
      confidenceScore,
      nativeScore,
      correctWords,
      missingWords: dedupeStrings(missing.slice(0, 4)),
      wordsToImprove,
      weakAreasDetected,
      pronunciationIssues,
      rhythmIssues,
      aiCoachCommentTr: buildCoachComment(
        matchRatio,
        rules,
        lesson.aiFeedbackRules?.exampleFeedbackTr ?? '',
      ),
      nextFocusTr: buildNextFocus(rules, segment.focusSkill ?? lesson.focusSkill ?? 'Shadowing'),
      recommendedLessonIds: recommended,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[EchoSpeak Mock Analysis] fallback due to error', {
        lessonId: input.lesson?.id,
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
    return createFallbackMockAnalysis(input);
  }
}

/** Async wrapper — future real API will be truly async. */
export async function analyzeSpeech(input: AiSpeechAnalysisInput): Promise<AiSpeechAnalysisOutput> {
  // FUTURE: if (USE_REAL_AI) return realSpeechAnalysisClient.analyze(input);
  return analyzeSpeechMock(input);
}

export const mockSpeechAnalysisService: SpeechAnalysisService = {
  analyze: analyzeSpeech,
};
