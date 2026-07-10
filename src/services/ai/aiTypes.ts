import { ContentLessonType, Lesson } from '../../types/lesson';
import { LessonSegment } from '../../types/segment';
import { UserLearningProfile } from '../../types/learning';
import { PracticeResult, PracticeMode } from '../../types/learning';
import type {
  PhonemeFeedback,
  WordPronunciationFeedback,
} from '../audioAnalysis/audioAnalysisTypes';

/** Analysis context — extends practice mode with custom AI lessons. */
export type AiAnalysisMode = PracticeMode | 'custom';

export interface AiSpeechAnalysisInput {
  targetText: string;
  userTranscript: string;
  lesson: Lesson;
  segment: LessonSegment;
  userProfile: UserLearningProfile;
  /** Reserved for real speech-to-text + audio scoring integration. */
  audioUri?: string;
  mode: AiAnalysisMode;
}

export interface PronunciationIssue {
  id: string;
  labelTr: string;
  detailTr: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RhythmIssue {
  id: string;
  labelTr: string;
  detailTr: string;
}

export interface AiSpeechAnalysisOutput {
  transcript: string;
  wordMatchScore: number;
  matchScore?: number;
  analysisMode?: 'text_match_only' | 'pronunciation_assessment';
  pronunciationAssessmentAvailable?: boolean;
  pronunciationProvider?: 'azure' | null;
  scoreSource?: 'azure_pronunciation' | 'text_match_only';
  pronunciationScore: number;
  accuracyScore?: number;
  fluencyScore: number;
  completenessScore?: number;
  prosodyScore?: number;
  rhythmScore: number;
  confidenceScore: number;
  nativeScore: number;
  correctWords: string[];
  missingWords: string[];
  wordsToImprove: string[];
  weakAreasDetected: string[];
  wordPronunciationFeedback?: WordPronunciationFeedback[];
  phonemeFeedback?: PhonemeFeedback[];
  pronunciationIssues: PronunciationIssue[];
  rhythmIssues: RhythmIssue[];
  aiCoachCommentTr: string;
  nextFocusTr: string;
  recommendedLessonIds: string[];
}

export interface AiLessonGenerationInput {
  userInputText: string;
  userGoal: string;
  userLevel: UserLearningProfile['level'];
  weakAreas: string[];
  preferredContentType: ContentLessonType;
}

/** Future real API: POST /ai/analyze-speech */
export interface SpeechAnalysisService {
  analyze(input: AiSpeechAnalysisInput): Promise<AiSpeechAnalysisOutput>;
}

/** Future real API: POST /ai/generate-lesson */
export interface LessonGenerationService {
  generate(input: AiLessonGenerationInput): Promise<Lesson>;
}

/** Map rich AI output into persisted practice result shape. */
export function analysisOutputToPracticeResult(
  output: AiSpeechAnalysisOutput,
  lessonId: string,
  segmentId: string | undefined,
  mode: PracticeMode,
  sessionId?: string,
): PracticeResult {
  return {
    resultId: `result-${Date.now()}-${lessonId}`,
    lessonId,
    segmentId,
    sessionId,
    mode,
    pronunciationScore: output.pronunciationScore,
    fluencyScore: output.fluencyScore,
    rhythmScore: output.rhythmScore,
    confidenceScore: output.confidenceScore,
    nativeScore: output.nativeScore,
    correctWords: output.correctWords,
    wordsToImprove: output.wordsToImprove,
    weakAreasDetected: output.weakAreasDetected,
    aiCoachCommentTr: output.aiCoachCommentTr,
    nextFocusTr: output.nextFocusTr,
    createdAt: new Date().toISOString(),
  };
}
