import { getLessonById } from '../../data/lessons';
import {
  getAnalysisProviderMode,
  isBackendAnalysisEndpointConfigured,
} from '../../config/analysisProviderConfig';
import { ENABLE_MOCK_ANALYSIS_IN_DEV } from '../../config/analysisConfig';
import { MIN_RECORDING_DURATION_MS } from '../../config/audioValidationConfig';
import { requestBackendSpeechAnalysis } from '../analysis/backendAnalysisProvider';
import type { BackendAnalysisSuccessResponse } from '../analysis/backendAnalysisTypes';
import { UserLearningProfile } from '../../types/learning';
import { Lesson } from '../../types/lesson';
import { LessonSegment } from '../../types/segment';
import { getActiveSegment } from '../../utils/lessonUtils';
import { analyzeSpeechMock } from '../ai/mockSpeechAnalysisService';
import { AiAnalysisMode, AiSpeechAnalysisOutput } from '../ai/aiTypes';
import { PracticeMode } from '../../types/learning';
import {
  AudioAnalysisInput,
  AudioAnalysisPipelineResult,
  PreparedAudio,
} from './audioAnalysisTypes';
import {
  ANALYSIS_LOW_VOLUME_TR,
  ANALYSIS_MISSING_RECORDING_TR,
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
import { computeWordMatchScore } from '../../utils/analysisWordDisplay';

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
      correctWords: response.correctWords,
      missingWords: response.missingWords,
      wordsToImprove: response.wordsToImprove,
      weakAreasDetected: response.weakAreasDetected,
    },
    aiCoachCommentTr: response.aiCoachCommentTr,
    nextFocusTr: response.nextFocusTr,
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
  if (errorCode === 'network_error' || errorCode === 'upload_failed') {
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
  });

  if (!backendResponse.ok) {
    throwBackendFailure(backendResponse.errorCode, backendResponse.messageTr);
  }

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
  if (!pipeline.transcription.transcript.trim() || pipeline.transcription.confidence <= 0) {
    throw new AnalysisUnavailableError('silent_recording', ANALYSIS_SILENT_RECORDING_TR);
  }

  const base = analyzeSpeechMock({
    targetText: context.targetText,
    userTranscript: pipeline.transcription.transcript,
    lesson: context.lesson,
    segment: context.segment,
    userProfile: context.userProfile,
    audioUri: pipeline.preparedAudio.uri,
    mode: context.mode,
  });

  return {
    ...base,
    transcript: pipeline.transcription.transcript,
    wordMatchScore: computeWordMatchScore(
      pipeline.scoring.correctWords,
      pipeline.scoring.missingWords,
      pipeline.scoring.wordsToImprove,
    ),
    matchScore: pipeline.scoring.matchScore,
    analysisMode: pipeline.analysisMode ?? pipeline.scoring.analysisMode,
    pronunciationAssessmentAvailable:
      pipeline.pronunciationAssessmentAvailable ??
      pipeline.scoring.pronunciationAssessmentAvailable,
    pronunciationScore: pipeline.scoring.pronunciationScore,
    fluencyScore: pipeline.scoring.fluencyScore,
    rhythmScore: pipeline.scoring.rhythmScore,
    confidenceScore: pipeline.scoring.confidenceScore,
    nativeScore: pipeline.scoring.nativeScore,
    correctWords: pipeline.scoring.correctWords,
    missingWords: pipeline.scoring.missingWords,
    wordsToImprove: pipeline.scoring.wordsToImprove,
    weakAreasDetected: pipeline.scoring.weakAreasDetected,
    aiCoachCommentTr: pipeline.aiCoachCommentTr,
    nextFocusTr: pipeline.nextFocusTr,
  };
}
