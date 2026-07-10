import { Lesson, ContentLessonType, LEVEL_TO_CEFR } from '../types/lesson';
import { LegacyLessonFlat } from '../types/legacyLesson';
import { levelFromDifficulty } from '../utils/lessonUtils';

function inferTypeFromLegacy(legacy: LegacyLessonFlat): ContentLessonType {
  if (legacy.id.includes('pronunciation')) return 'pronunciation_drill';
  if (legacy.id.includes('dialogue') || legacy.id.includes('series')) {
    return legacy.isPremium ? 'dialogue_practice' : 'sentence_practice';
  }
  return 'sentence_practice';
}

function defaultContentGoal(type: ContentLessonType): Lesson['quality']['contentGoal'] {
  switch (type) {
    case 'pronunciation_drill':
      return 'pronunciation';
    case 'native_speed_practice':
    case 'song_rhythm_practice':
      return 'fluency';
    case 'real_speech_practice':
      return 'listening';
    case 'dialogue_practice':
      return 'real_life_usage';
    default:
      return 'confidence';
  }
}

export function migrateLegacyLesson(legacy: LegacyLessonFlat): Lesson {
  const level = levelFromDifficulty(legacy.difficulty);
  const type = inferTypeFromLegacy(legacy);

  return {
    id: legacy.id,
    title: legacy.title,
    subtitle: legacy.focusSkill,
    type,
    category: legacy.category,
    level,
    cefrLevel: LEVEL_TO_CEFR[level],
    estimatedMinutes: legacy.estimatedMinutes,
    focusSkill: legacy.focusSkill,
    learningObjectiveTr: `${legacy.focusSkill} becerisini günlük konuşmada kullanmayı öğren.`,
    isPremium: legacy.isPremium,
    premiumReasonTr: legacy.isPremium ? 'Detaylı AI analiz ve ileri içerik' : undefined,
    sourceType: 'original',
    copyrightStatus: 'safe_original',
    segments: [
      {
        id: `${legacy.id}-seg-1`,
        order: 1,
        text: legacy.targetSentence,
        translationTr: legacy.TurkishTranslation,
        slowPracticeText: legacy.slowPracticeSentence,
        naturalVersion: legacy.targetSentence,
        nativeSpeedNoteTr: legacy.naturalSpeedNote,
        usageExplanationTr: legacy.usageExplanationTr,
        pronunciationTipTr: legacy.pronunciationTipTr,
        commonMistakeTr: legacy.commonMistakeTr,
        shadowingInstructionTr: legacy.shadowingInstructionTr,
        focusSkill: legacy.focusSkill,
        keywords: legacy.keywords,
        difficulty: legacy.difficulty,
      },
    ],
    keywords: legacy.keywords,
    tags: [legacy.category, type],
    createdForTurkishSpeakers: true,
    aiFeedbackRules: {
      exampleFeedbackTr: legacy.aiCoachExampleFeedbackTr,
      focusAreas: [legacy.focusSkill],
      priorityChecks: ['pronunciation', 'rhythm', 'word linking'],
    },
    recommendedNextLessonIds: [],
    quality: {
      isReviewed: true,
      reviewedBy: 'EchoSpeak Pedagogy',
      pedagogyNotesTr: 'Küratörlü temel shadowing dersi.',
      accuracyLevel: 'reviewed',
      contentGoal: defaultContentGoal(type),
    },
  };
}
