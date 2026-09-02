import { getLessonById } from '../../data/lessons';
import { calculateNativeScore, getRecommendedLessons } from '../../data/learningAlgorithm';
import { contentCatalog } from '../../data/content/contentCatalog';
import {
  getAnalysisProviderMode,
  isBackendAnalysisEndpointConfigured,
} from '../../config/analysisProviderConfig';
import { ENABLE_MOCK_ANALYSIS_IN_DEV } from '../../config/analysisConfig';
import { MIN_RECORDING_DURATION_MS } from '../../config/audioValidationConfig';
import { requestBackendSpeechAnalysis } from '../analysis/backendAnalysisProvider';
import { getUiLanguage } from '../../i18n';
import type { BackendAnalysisSuccessResponse } from '../analysis/backendAnalysisTypes';
import { UserLearningProfile } from '../../types/learning';
import { Lesson } from '../../types/lesson';
import { LessonSegment } from '../../types/segment';
import { getActiveSegment } from '../../utils/lessonUtils';
import { dedupeStrings } from '../../utils/stringUtils';
import { analyzeSpeechMock } from '../ai/mockSpeechAnalysisService';
import { getMatchingFeedbackRules } from '../ai/feedbackRules';
import {
  AiAnalysisMode,
  AiSpeechAnalysisOutput,
  PronunciationIssue,
  RhythmIssue,
} from '../ai/aiTypes';
import { PracticeMode } from '../../types/learning';
import {
  AudioAnalysisInput,
  AudioAnalysisPipelineResult,
  PreparedAudio,
  PronunciationScoringResult,
} from './audioAnalysisTypes';
import {
  ANALYSIS_LOW_VOLUME_TR,
  ANALYSIS_MISSING_RECORDING_TR,
  ANALYSIS_PARTIAL_TRANSCRIPT_TR,
  ANALYSIS_REAL_DISABLED_TR,
  ANALYSIS_SILENT_RECORDING_TR,
  ANALYSIS_TOO_SHORT_TR,
  AnalysisUnavailableError,
} from './analysisErrors';
import {
  mockScorePronunciation,
  INSUFFICIENT_SPEECH_COACH_TR,
  INSUFFICIENT_SPEECH_FOCUS_TR,
} from './mockPronunciationScoringService';
import { mockTranscribeAudio } from './mockTranscriptionService';
import { prepareAudioForAnalysis } from './prepareAudioForAnalysis';
import {
  computeWordMatchScore,
  wordsEquivalentForDisplay,
} from '../../utils/analysisWordDisplay';

export interface AudioAnalysisPipelineContext {
  lesson?: Lesson;
  segment?: LessonSegment;
  userProfile?: UserLearningProfile;
}

function resolveLessonContext(input: AudioAnalysisInput, context?: AudioAnalysisPipelineContext) {
  const lesson = context?.lesson ?? getLessonById(input.lessonId);
  const segment =
    context?.segment ??
    (lesson
      ? lesson.segments.find((s) => s.id === input.segmentId) ?? getActiveSegment(lesson, 0)
      : undefined);

  return { lesson, segment };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Reject truncated-capture uploads before showing misleading scores. */
function assertTranscriptCoversSpeech(
  transcript: string,
  targetText: string,
  durationMillis: number,
): void {
  const transcriptWords = tokenize(transcript);
  const targetWords = tokenize(targetText);
  if (targetWords.length === 0 || transcriptWords.length === 0) {
    return;
  }

  const coverageRatio = transcriptWords.length / targetWords.length;
  const veryShortCapture =
    transcriptWords.length <= 2 && targetWords.length >= 4 && durationMillis >= 1000;
  const lowCoverage =
    coverageRatio < 0.25 && targetWords.length >= 5 && durationMillis >= 1000;

  if (veryShortCapture || lowCoverage) {
    throw new AnalysisUnavailableError('partial_transcript', ANALYSIS_PARTIAL_TRANSCRIPT_TR);
  }
}

function mapBackendResponseToPipeline(
  preparedAudio: PreparedAudio,
  response: BackendAnalysisSuccessResponse,
): AudioAnalysisPipelineResult {
  const detectedWords = tokenize(response.transcript);
  const confidence = Math.min(1, Math.max(0, response.confidenceScore / 100));

  return {
    preparedAudio,
    transcription: {
      transcript: response.transcript,
      confidence,
      language: 'en',
      detectedWords,
    },
    scoring: {
      pronunciationScore: response.pronunciationScore,
      fluencyScore: response.fluencyScore,
      rhythmScore: response.rhythmScore,
      confidenceScore: response.confidenceScore,
      nativeScore: response.nativeScore,
      matchScore: response.matchScore,
      analysisMode: response.analysisMode,
      pronunciationAssessmentAvailable: response.pronunciationAssessmentAvailable,
      pronunciationProvider: response.pronunciationProvider,
      scoreSource: response.scoreSource,
      accuracyScore: response.accuracyScore,
      completenessScore: response.completenessScore,
      prosodyScore: response.prosodyScore,
      correctWords: response.correctWords,
      missingWords: response.missingWords,
      wordsToImprove: response.wordsToImprove,
      weakAreasDetected: response.weakAreasDetected,
      wordPronunciationFeedback: response.wordPronunciationFeedback,
      phonemeFeedback: response.phonemeFeedback,
      feedbackType: response.feedbackType,
    },
    aiCoachCommentTr: response.aiCoachCommentTr,
    nextFocusTr: response.nextFocusTr,
    feedbackType: response.feedbackType,
    analysisMode: response.analysisMode,
    pronunciationAssessmentAvailable: response.pronunciationAssessmentAvailable,
    createdAt: new Date().toISOString(),
  };
}

function throwBackendFailure(
  errorCode: string,
  messageTr: string,
): never {
  if (errorCode === 'backend_not_configured') {
    throw new AnalysisUnavailableError('real_analysis_disabled', messageTr);
  }
  if (errorCode === 'silent_recording') {
    throw new AnalysisUnavailableError('silent_recording', messageTr);
  }
  if (
    errorCode === 'network_error' ||
    errorCode === 'upload_failed' ||
    errorCode === 'upload_format_error' ||
    errorCode === 'backend_error' ||
    errorCode === 'invalid_response' ||
    errorCode === 'file_missing'
  ) {
    throw new AnalysisUnavailableError('processing_failed', messageTr);
  }
  throw new AnalysisUnavailableError('processing_failed', messageTr);
}

function logAnalysisGate(input: AudioAnalysisInput, decision: string): void {
  if (!__DEV__) return;

  console.log('[EchoSpeak Analysis Gate]', {
    hasAudioUri: Boolean(input.audioUri?.trim()),
    durationValid: (input.durationMillis ?? 0) >= MIN_RECORDING_DURATION_MS,
    hasSpeech: input.hasSpeech === true,
    recordingValidationValid: input.recordingValidation?.isValid === true,
    providerMode: getAnalysisProviderMode(),
    backendEndpointConfigured: isBackendAnalysisEndpointConfigured(),
    mockAnalysisEnabled: __DEV__ && ENABLE_MOCK_ANALYSIS_IN_DEV,
    finalDecision: decision,
  });
}

function assertSpeechActivity(input: AudioAnalysisInput): void {
  const validation = input.recordingValidation;

  if (validation && !validation.isValid) {
    if (validation.reason === 'low_volume') {
      throw new AnalysisUnavailableError('low_volume', ANALYSIS_LOW_VOLUME_TR);
    }
    if (validation.reason === 'file_empty' || validation.reason === 'file_missing') {
      throw new AnalysisUnavailableError(
        'missing_recording',
        validation.messageTr || ANALYSIS_MISSING_RECORDING_TR,
      );
    }
    if (validation.reason === 'silent_recording' || !validation.hasSpeech) {
      throw new AnalysisUnavailableError('silent_recording', ANALYSIS_SILENT_RECORDING_TR);
    }
    throw new AnalysisUnavailableError('processing_failed', validation.messageTr);
  }

  if (input.hasSpeech !== true) {
    throw new AnalysisUnavailableError('silent_recording', ANALYSIS_SILENT_RECORDING_TR);
  }
}

function assertValidAnalysisInput(input: AudioAnalysisInput): void {
  const uri = input.audioUri?.trim();
  if (!uri) {
    throw new AnalysisUnavailableError('missing_recording', ANALYSIS_MISSING_RECORDING_TR);
  }

  const durationMillis = input.durationMillis ?? 0;
  if (durationMillis < MIN_RECORDING_DURATION_MS) {
    throw new AnalysisUnavailableError('too_short', ANALYSIS_TOO_SHORT_TR);
  }

  assertSpeechActivity(input);
}

async function runBackendAnalysisPipeline(
  input: AudioAnalysisInput,
  preparedAudio: PreparedAudio,
): Promise<AudioAnalysisPipelineResult> {
  logAnalysisGate(input, 'backend');

  const backendResponse = await requestBackendSpeechAnalysis({
    audioUri: preparedAudio.uri,
    userId: input.userId ?? 'guest-local',
    lessonId: input.lessonId,
    segmentId: input.segmentId,
    targetText: input.targetText,
    durationMillis: preparedAudio.durationMillis ?? input.durationMillis ?? 0,
    mode: input.mode,
    uiLanguage: getUiLanguage(),
  });

  if (!backendResponse.ok) {
    throwBackendFailure(backendResponse.errorCode, backendResponse.messageTr);
  }

  assertTranscriptCoversSpeech(
    backendResponse.transcript,
    input.targetText,
    preparedAudio.durationMillis ?? input.durationMillis ?? 0,
  );

  return mapBackendResponseToPipeline(preparedAudio, backendResponse);
}

async function runDevMockAnalysisPipeline(
  input: AudioAnalysisInput,
  preparedAudio: PreparedAudio,
  context?: AudioAnalysisPipelineContext,
): Promise<AudioAnalysisPipelineResult> {
  logAnalysisGate(input, 'dev_mock');

  console.log(
    '[EchoSpeak Analysis] Using mock analysis because real STT is not configured.',
  );

  const { lesson, segment } = resolveLessonContext(input, context);
  const transcription = await mockTranscribeAudio(input);

  if (!transcription.transcript.trim() || transcription.confidence <= 0) {
    throw new AnalysisUnavailableError('silent_recording', ANALYSIS_SILENT_RECORDING_TR);
  }

  const scoring = await mockScorePronunciation({
    targetText: input.targetText,
    transcript: transcription.transcript,
    confidence: transcription.confidence,
    input,
    lesson,
    segment,
    userProfile: context?.userProfile,
  });

  const isInsufficientSpeech =
    !transcription.transcript.trim() || transcription.confidence < 0.5;

  if (isInsufficientSpeech) {
    throw new AnalysisUnavailableError('silent_recording', ANALYSIS_SILENT_RECORDING_TR);
  }

  let aiCoachCommentTr = INSUFFICIENT_SPEECH_COACH_TR;
  let nextFocusTr = INSUFFICIENT_SPEECH_FOCUS_TR;

  if (lesson && segment && context?.userProfile) {
    const coachOutput = analyzeSpeechMock({
      targetText: input.targetText,
      userTranscript: transcription.transcript,
      lesson,
      segment,
      userProfile: context.userProfile,
      audioUri: preparedAudio.uri,
      mode: input.mode as AiAnalysisMode,
    });
    aiCoachCommentTr = coachOutput.aiCoachCommentTr;
    nextFocusTr = coachOutput.nextFocusTr;
  }

  return {
    preparedAudio,
    transcription,
    scoring,
    aiCoachCommentTr,
    nextFocusTr,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Single integration point for speech analysis.
 * Routes to backend upload when configured, otherwise dev mock or unavailable.
 */
export async function runAudioAnalysisPipeline(
  input: AudioAnalysisInput,
  context?: AudioAnalysisPipelineContext,
): Promise<AudioAnalysisPipelineResult> {
  assertValidAnalysisInput(input);

  const preparedAudio = await prepareAudioForAnalysis(input);
  const providerMode = getAnalysisProviderMode();

  switch (providerMode) {
    case 'backend':
      return runBackendAnalysisPipeline(input, preparedAudio);
    case 'dev_mock':
      return runDevMockAnalysisPipeline(input, preparedAudio, context);
    case 'disabled':
    default:
      logAnalysisGate(input, 'disabled');
      throw new AnalysisUnavailableError('real_analysis_disabled', ANALYSIS_REAL_DISABLED_TR);
  }
}

const DEFAULT_BACKEND_COACH_TR =
  'Her deneme seni ileri taşır. Önce yavaş, sonra doğal ritimle tekrar et.';
const DEFAULT_BACKEND_FOCUS_TR =
  'Cümleyi tek nefeste, bağlı bir ritimle tekrar et.';

function resolveNumericScore(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function buildPronunciationIssues(
  rules: ReturnType<typeof getMatchingFeedbackRules>,
): PronunciationIssue[] {
  return rules
    .filter((rule) => ['th_sound', 'w_v_distinction', 'final_consonants'].includes(rule.id))
    .map((rule) => {
      let severity: PronunciationIssue['severity'] = 'low';
      if (rule.penalty >= 8) severity = 'high';
      else if (rule.penalty >= 6) severity = 'medium';
      return {
        id: rule.id,
        labelTr: rule.labelTr,
        detailTr: rule.coachTipTr,
        severity,
      };
    });
}

function buildRhythmIssues(rules: ReturnType<typeof getMatchingFeedbackRules>): RhythmIssue[] {
  return rules
    .filter((rule) =>
      ['rhythm_stress', 'word_linking', 'word_by_word', 'fast_reductions'].includes(rule.id),
    )
    .map((rule) => ({
      id: rule.id,
      labelTr: rule.labelTr,
      detailTr: rule.coachTipTr,
    }));
}

function buildRecommendedLessonIds(
  userProfile: UserLearningProfile,
  currentLessonId: string,
): string[] {
  try {
    const catalogLessons = Array.isArray(contentCatalog) ? contentCatalog : [];
    return getRecommendedLessons(userProfile, catalogLessons, 2)
      .filter((lesson) => lesson.id !== currentLessonId)
      .map((lesson) => lesson.id);
  } catch {
    return [];
  }
}

/**
 * Azure moves weakly pronounced words out of "missing" (they were spoken), which
 * can leave them absent from every word list while the coach comment still
 * mentions them. Surface those words under "improve" and drop them from
 * "correct" so chips and the match percent stay consistent with the coaching.
 */
function reconcileWeakWordsForDisplay(scoring: PronunciationScoringResult): {
  correctWords: string[];
  missingWords: string[];
  wordsToImprove: string[];
} {
  const missingWords = dedupeStrings(scoring.missingWords ?? []);
  const weakWords = (scoring.wordPronunciationFeedback ?? [])
    .filter((item) => !item.issueType || item.issueType === 'pronunciation')
    .map((item) => item.word.trim())
    .filter(Boolean)
    .filter((word) => !missingWords.some((missing) => wordsEquivalentForDisplay(missing, word)));

  // Prefer backend pronunciation-backed improve list; merge Azure pronunciation words.
  const wordsToImprove = dedupeStrings([...(scoring.wordsToImprove ?? []), ...weakWords]).filter(
    (word) => !missingWords.some((missing) => wordsEquivalentForDisplay(missing, word)),
  );
  const correctWords = dedupeStrings(scoring.correctWords ?? []).filter(
    (word) => !weakWords.some((weak) => wordsEquivalentForDisplay(weak, word)),
  );

  return { correctWords, missingWords, wordsToImprove };
}

/** Maps pipeline output into the rich AI analysis shape used by existing screens. */
export function pipelineResultToAiSpeechAnalysisOutput(
  pipeline: AudioAnalysisPipelineResult,
  context: {
    targetText: string;
    lesson: Lesson;
    segment: LessonSegment;
    userProfile: UserLearningProfile;
    mode: PracticeMode;
  },
): AiSpeechAnalysisOutput {
  const transcript = pipeline.transcription.transcript.trim();
  if (!transcript || pipeline.transcription.confidence <= 0) {
    throw new AnalysisUnavailableError('silent_recording', ANALYSIS_SILENT_RECORDING_TR);
  }

  const scoring = pipeline.scoring;
  const pronunciationScore = resolveNumericScore(scoring.pronunciationScore) ?? 0;
  const fluencyScore = resolveNumericScore(scoring.fluencyScore) ?? 0;
  const rhythmScore = resolveNumericScore(scoring.rhythmScore) ?? 0;
  const confidenceScore = resolveNumericScore(scoring.confidenceScore) ?? 0;
  const nativeScore =
    resolveNumericScore(scoring.nativeScore) ??
    calculateNativeScore({
      pronunciationScore,
      fluencyScore,
      rhythmScore,
      confidenceScore,
    });

  const { correctWords, missingWords, wordsToImprove } =
    reconcileWeakWordsForDisplay(scoring);

  const wordMatchScore =
    computeWordMatchScore(correctWords, missingWords, wordsToImprove) ||
    resolveNumericScore(scoring.matchScore) ||
    0;

  const feedbackRules = getMatchingFeedbackRules(
    context.targetText,
    transcript,
    context.userProfile.weakAreas,
  );

  if (__DEV__) {
    console.log('[EchoSpeak Analysis] backend pipeline scores', {
      scoreSource: scoring.scoreSource ?? null,
      analysisMode: pipeline.analysisMode ?? scoring.analysisMode ?? null,
      nativeScore,
      matchScore: scoring.matchScore ?? null,
      transcriptLength: transcript.length,
    });
  }

  return {
    transcript,
    wordMatchScore,
    matchScore: scoring.matchScore,
    analysisMode: pipeline.analysisMode ?? scoring.analysisMode,
    pronunciationAssessmentAvailable:
      pipeline.pronunciationAssessmentAvailable ?? scoring.pronunciationAssessmentAvailable,
    pronunciationProvider: scoring.pronunciationProvider,
    scoreSource: scoring.scoreSource,
    pronunciationScore,
    accuracyScore: scoring.accuracyScore,
    fluencyScore,
    completenessScore: scoring.completenessScore,
    prosodyScore: scoring.prosodyScore,
    rhythmScore,
    confidenceScore,
    nativeScore,
    correctWords,
    missingWords,
    wordsToImprove,
    weakAreasDetected: dedupeStrings(scoring.weakAreasDetected ?? []),
    wordPronunciationFeedback: scoring.wordPronunciationFeedback,
    phonemeFeedback: scoring.phonemeFeedback,
    pronunciationIssues: buildPronunciationIssues(feedbackRules),
    rhythmIssues: buildRhythmIssues(feedbackRules),
    aiCoachCommentTr: pipeline.aiCoachCommentTr?.trim() || DEFAULT_BACKEND_COACH_TR,
    nextFocusTr: pipeline.nextFocusTr?.trim() || DEFAULT_BACKEND_FOCUS_TR,
    recommendedLessonIds: buildRecommendedLessonIds(context.userProfile, context.lesson.id),
    feedbackType: pipeline.feedbackType ?? scoring.feedbackType,
  };
}
