import type { SegmentInput } from '../lessonFactory';
import type { LessonDifficultyLabel, LessonLevel } from '../../../types/lesson';
import { buildShadowingCoach, enrichCoachTip } from './coachCopy';

export type QuickSegment = {
  en: string;
  tr: string;
  tip: string;
  usage: string;
  mistake: string;
  skill: string;
  keywords: string[];
  difficulty?: LessonDifficultyLabel;
  rhythm?: string;
  speaker?: string;
  targetSounds?: string[];
  naturalVersion?: string;
  /** Reusable phrase pattern shown to the learner, e.g. "Can I get…" */
  patternTr?: string;
  /** Which words to stress, e.g. "please kelimesini yumuşak bitir" */
  stressTr?: string;
  /** Optional curated vocabulary for Kelime Defterim */
  vocabulary?: Array<{ word: string; translationTr: string }>;
};

const DIFFICULTY_BY_LEVEL: Record<LessonLevel, LessonDifficultyLabel> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

const WPM_BY_LEVEL = { beginner: 118, intermediate: 134, advanced: 150 } as const;

export function segmentsForLesson(
  lessonId: string,
  items: QuickSegment[],
  level: LessonLevel,
): SegmentInput[] {
  const defaultDifficulty = DIFFICULTY_BY_LEVEL[level];

  return items.map((item, index) => {
    const order = index + 1;
    const rhythm =
      item.rhythm ??
      item.en
        .replace(/,\s+/g, ' / ')
        .replace(/\?\s*$/, ' ?')
        .replace(/\.\s*$/, '');

    const patternTr =
      item.patternTr ??
      (item.keywords[0] ? `"${item.keywords[0]}" kalıbını ezberle ve tekrar kullan.` : undefined);

    const stressTr =
      item.stressTr ??
      (item.keywords[1] ? `"${item.keywords[1]}" üzerinde hafif vurgu yap.` : undefined);

    return {
      id: `${lessonId}-s${order}`,
      order,
      speaker: item.speaker,
      text: item.en,
      translationTr: item.tr,
      slowPracticeText: rhythm,
      pauseMarkedText: rhythm,
      naturalVersion: item.naturalVersion,
      highlightedWords: item.keywords,
      usageExplanationTr: item.usage,
      pronunciationTipTr: enrichCoachTip(item.tip, patternTr),
      commonMistakeTr: item.mistake,
      shadowingInstructionTr: buildShadowingCoach({
        rhythm,
        patternTr,
        stressTr,
        skill: item.skill,
      }),
      focusSkill: item.skill,
      keywords: item.keywords,
      difficulty: item.difficulty ?? defaultDifficulty,
      durationSeconds: 5 + order * 2,
      speechRateWpm: WPM_BY_LEVEL[level],
      accent: 'american',
      speedLevel: level === 'advanced' ? 'fast' : level === 'intermediate' ? 'natural' : 'slow',
      hasFillers: order > 2,
      containsReductions: order > 1,
      linkedWords: item.keywords.slice(0, 2),
      targetSounds: item.targetSounds,
      ...(item.vocabulary && item.vocabulary.length > 0
        ? { vocabulary: item.vocabulary }
        : {}),
    };
  });
}
