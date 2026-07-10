import { Lesson } from '../../types/lesson';
import { resolveLessonPremium } from '../../utils/lessonUtils';

interface Rule {
  patterns: string[];
  freeLessonTitleHints: string[];
  premiumLessonTitleHints?: string[];
}

const RULES: Rule[] = [
  {
    patterns: ['th', 'th sesi', 'th_sound'],
    freeLessonTitleHints: ['th sound basics'],
    premiumLessonTitleHints: ['advanced th practice'],
  },
  {
    patterns: ['w/v', 'w / v', 'w_v_distinction'],
    freeLessonTitleHints: ['w and v difference'],
  },
  {
    patterns: ['linking', 'kelime bağlama', 'word_linking'],
    freeLessonTitleHints: ['linking words'],
    premiumLessonTitleHints: ['fast linking practice'],
  },
  {
    patterns: ['ritim', 'vurgu', 'rhythm_stress', 'rhythm'],
    freeLessonTitleHints: ['rhythm and stress'],
    premiumLessonTitleHints: ['rhythm drill'],
  },
  {
    patterns: ['final consonants', 'kelime sonu'],
    freeLessonTitleHints: ['final sounds'],
  },
  {
    patterns: ['weak forms', 'zayıf sesler'],
    freeLessonTitleHints: ['weak forms'],
  },
  {
    patterns: ['reductions', 'gonna', 'wanna', 'gotta', 'fast reductions'],
    freeLessonTitleHints: ['weak forms'],
    premiumLessonTitleHints: ['reductions: gonna / wanna / gotta'],
  },
];

function normalize(value: string): string {
  return value.toLocaleLowerCase('tr-TR');
}

function includesAny(target: string, patterns: string[]): boolean {
  return patterns.some((p) => target.includes(p));
}

export function getRecommendedLessonIdsFromWeakAreas(
  weakAreas: string[],
  lessons: Lesson[],
  isPremiumUser: boolean,
): string[] {
  const pronunciationLessons = lessons.filter((lesson) => lesson.category === 'pronunciation');
  const normalizedWeakAreas = weakAreas.map(normalize);
  const selectedIds: string[] = [];

  for (const area of normalizedWeakAreas) {
    const matchedRule = RULES.find((rule) => includesAny(area, rule.patterns));
    if (!matchedRule) continue;

    const titleHints = [
      ...matchedRule.freeLessonTitleHints,
      ...(isPremiumUser ? matchedRule.premiumLessonTitleHints ?? [] : []),
    ].map(normalize);

    const candidate = pronunciationLessons.find((lesson) =>
      titleHints.some((hint) => normalize(lesson.title).includes(hint)),
    );

    if (candidate && !selectedIds.includes(candidate.id)) {
      selectedIds.push(candidate.id);
      continue;
    }

    if (!isPremiumUser) {
      const freeFallback = pronunciationLessons.find(
        (lesson) => !resolveLessonPremium(lesson) && !selectedIds.includes(lesson.id),
      );
      if (freeFallback) selectedIds.push(freeFallback.id);
    } else {
      const anyFallback = pronunciationLessons.find((lesson) => !selectedIds.includes(lesson.id));
      if (anyFallback) selectedIds.push(anyFallback.id);
    }
  }

  return selectedIds.slice(0, 3);
}
