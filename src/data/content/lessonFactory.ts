import {
  AiFeedbackRules,
  CefrLevel,
  ContentGoal,
  ContentLessonType,
  Lesson,
  LessonCategory,
  LessonLevel,
  LessonQuality,
  LEVEL_TO_CEFR,
  PREMIUM_CONTENT_TYPES,
} from '../../types/lesson';
import {
  DEFAULT_METHODOLOGY_STEPS,
  DEFAULT_PLAYBACK_SPEEDS,
  PREMIUM_METHODOLOGY_STEPS,
  PREMIUM_SHADOWING_MODES,
  FREE_SHADOWING_MODES,
  PracticeStep,
  PlaybackSpeed,
  DelayOption,
  ShadowingPracticeMode,
  SpeechAccent,
  SpeechSpeedLevel,
} from '../../types/practiceMethodology';
import { LessonSegment } from '../../types/segment';
import { DEFAULT_COACH_SHADOWING } from './catalog/coachCopy';

export interface SegmentInput {
  id: string;
  order: number;
  speaker?: string;
  text: string;
  translationTr: string;
  slowPracticeText: string;
  naturalVersion?: string;
  nativeSpeedNoteTr?: string;
  usageExplanationTr: string;
  pronunciationTipTr: string;
  commonMistakeTr: string;
  shadowingInstructionTr?: string;
  focusSkill: string;
  targetSounds?: string[];
  linkedWords?: string[];
  keywords: string[];
  difficulty: LessonSegment['difficulty'];
  durationSeconds?: number;
  speechRateWpm?: number;
  accent?: SpeechAccent;
  speedLevel?: SpeechSpeedLevel;
  hasFillers?: boolean;
  containsReductions?: boolean;
  stressPatternText?: string;
  pauseMarkedText?: string;
  highlightedWords?: string[];
  availablePracticeModes?: ShadowingPracticeMode[];
  recommendedPracticeStep?: PracticeStep;
  vocabulary?: LessonSegment['vocabulary'];
}

export interface LessonInput {
  id: string;
  title: string;
  subtitle: string;
  titleTr?: string;
  subtitleTr?: string;
  type: ContentLessonType;
  category: LessonCategory;
  level: LessonLevel;
  cefrLevel?: CefrLevel;
  estimatedMinutes: 3 | 5 | 7;
  focusSkill: string;
  learningObjectiveTr: string;
  isPremium?: boolean;
  premiumReasonTr?: string;
  sourceType?: Lesson['sourceType'];
  copyrightStatus?: Lesson['copyrightStatus'];
  sourceTitle?: string;
  segments: SegmentInput[];
  keywords: string[];
  tags: string[];
  aiFeedbackRules: AiFeedbackRules;
  recommendedNextLessonIds?: string[];
  quality: Omit<LessonQuality, 'isReviewed'> & { isReviewed?: boolean; reviewedBy?: string };
  methodologySteps?: PracticeStep[];
  defaultPlaybackSpeed?: PlaybackSpeed;
  availablePlaybackSpeeds?: PlaybackSpeed[];
  defaultDelayMs?: DelayOption;
  maxRecommendedDurationSeconds?: number;
}

const DEFAULT_SHADOWING = DEFAULT_COACH_SHADOWING;

const WPM_BY_LEVEL = { beginner: 120, intermediate: 145, advanced: 165 } as const;
const SPEED_BY_LEVEL = { beginner: 'slow', intermediate: 'natural', advanced: 'fast' } as const;

function buildSegment(input: SegmentInput, lessonLevel: LessonLevel, isPremium: boolean): LessonSegment {
  return {
    ...input,
    shadowingInstructionTr: input.shadowingInstructionTr ?? DEFAULT_SHADOWING,
    nativeSpeedNoteTr: input.nativeSpeedNoteTr ?? '',
    durationSeconds: input.durationSeconds ?? 8,
    speechRateWpm: input.speechRateWpm ?? WPM_BY_LEVEL[lessonLevel],
    accent: input.accent ?? 'american',
    speedLevel: input.speedLevel ?? SPEED_BY_LEVEL[lessonLevel],
    hasFillers: input.hasFillers ?? false,
    containsReductions: input.containsReductions ?? false,
    pauseMarkedText: input.pauseMarkedText ?? input.slowPracticeText,
    highlightedWords: input.highlightedWords ?? input.keywords,
    availablePracticeModes:
      input.availablePracticeModes ?? (isPremium ? PREMIUM_SHADOWING_MODES : FREE_SHADOWING_MODES),
    recommendedPracticeStep: input.recommendedPracticeStep ?? 'subtitle_shadowing',
  };
}

function inferPremium(input: LessonInput): boolean {
  if (input.isPremium !== undefined) return input.isPremium;
  if (PREMIUM_CONTENT_TYPES.includes(input.type)) return true;
  if (input.type === 'dialogue_practice' && input.level === 'advanced') return true;
  if (input.type === 'pronunciation_drill' && input.level === 'advanced') return true;
  return false;
}

export function createLesson(input: LessonInput): Lesson {
  const isPremium = inferPremium(input);
  const segments = input.segments
    .map((seg) => buildSegment(seg, input.level, isPremium))
    .sort((a, b) => a.order - b.order);

  return {
    id: input.id,
    title: input.title,
    subtitle: input.subtitle,
    titleTr: input.titleTr,
    subtitleTr: input.subtitleTr,
    type: input.type,
    category: input.category,
    level: input.level,
    cefrLevel: input.cefrLevel ?? LEVEL_TO_CEFR[input.level],
    estimatedMinutes: input.estimatedMinutes,
    focusSkill: input.focusSkill,
    learningObjectiveTr: input.learningObjectiveTr,
    isPremium,
    premiumReasonTr: isPremium ? input.premiumReasonTr ?? defaultPremiumReason(input.type) : undefined,
    sourceType: input.sourceType ?? 'original',
    copyrightStatus: input.copyrightStatus ?? 'safe_original',
    sourceTitle: input.sourceTitle,
    segments,
    keywords: input.keywords,
    tags: input.tags,
    createdForTurkishSpeakers: true,
    aiFeedbackRules: input.aiFeedbackRules,
    recommendedNextLessonIds: input.recommendedNextLessonIds ?? [],
    methodologySteps:
      input.methodologySteps ??
      (isPremium ? PREMIUM_METHODOLOGY_STEPS : DEFAULT_METHODOLOGY_STEPS),
    defaultPlaybackSpeed: input.defaultPlaybackSpeed ?? 0.85,
    availablePlaybackSpeeds: input.availablePlaybackSpeeds ?? DEFAULT_PLAYBACK_SPEEDS,
    defaultDelayMs: input.defaultDelayMs ?? 0,
    maxRecommendedDurationSeconds: input.maxRecommendedDurationSeconds ?? 8,
    quality: {
      isReviewed: input.quality.isReviewed ?? true,
      reviewedBy: input.quality.reviewedBy ?? 'EchoSpeak Pedagogy',
      pedagogyNotesTr: input.quality.pedagogyNotesTr,
      accuracyLevel: input.quality.accuracyLevel ?? 'reviewed',
      contentGoal: input.quality.contentGoal,
    },
  };
}

function defaultPremiumReason(type: ContentLessonType): string {
  switch (type) {
    case 'native_speed_practice':
      return 'Native hız pratiği';
    case 'real_speech_practice':
      return 'Gerçek konuşma örneği';
    case 'custom_ai_practice':
      return 'Kişisel AI dersi';
    case 'song_rhythm_practice':
      return 'Ritim ve vurgu pratiği';
    case 'dialogue_practice':
      return 'İleri seviye diyalog';
    case 'pronunciation_drill':
      return 'Detaylı telaffuz analizi';
    default:
      return 'SpeakPlus içerik';
  }
}

/** Batch-create lessons and wire sequential recommendedNextLessonIds within a category path. */
export function linkLessonChain(lessonList: Lesson[]): Lesson[] {
  return lessonList.map((lesson, index) => ({
    ...lesson,
    recommendedNextLessonIds:
      (lesson.recommendedNextLessonIds?.length ?? 0) > 0
        ? lesson.recommendedNextLessonIds
        : index < lessonList.length - 1
          ? [lessonList[index + 1].id]
          : [],
  }));
}
