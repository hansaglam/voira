import { DailyPracticeSession } from '../types/dailyPractice';
import { Lesson, LessonCategory, LessonLevel } from '../types/lesson';
import {
  NativeScoreParts,
  PracticeMode,
  PracticeResult,
  UserLearningProfile,
} from '../types/learning';
import { getExampleFeedback, getAllKeywords, resolveLessonPremium, isLastLessonSegment } from '../utils/lessonUtils';
import { LessonSegment } from '../types/segment';
import { lessons } from './lessons';
import {
  ensureLessonArray,
  getSafeLessonField,
  logSkippedMalformedLesson,
  normalizeLearningProfile,
  validateLessonForRecommendation,
} from '../utils/recommendationSafety';

const DAILY_LESSON_COUNT = 3;

const GOAL_TO_CATEGORIES: Record<string, LessonCategory[]> = {
  daily_conversation: ['daily', 'cafe_restaurant'],
  job_interview: ['job_interview'],
  travel: ['travel'],
  cafe_restaurant: ['cafe_restaurant', 'daily'],
  series_english: ['series_english', 'daily'],
  media: ['series_english', 'daily'],
  pronunciation: ['pronunciation'],
  confidence_shy: ['daily'],
  confidence_fluency: ['daily', 'cafe_restaurant'],
  confidence_native: ['series_english', 'pronunciation'],
};

const LEVEL_TO_LESSON_LEVELS: Record<UserLearningProfile['level'], LessonLevel[]> = {
  beginner: ['beginner'],
  intermediate: ['beginner', 'intermediate'],
  advanced: ['intermediate', 'advanced'],
  unsure: ['beginner', 'intermediate'],
};

const CHALLENGE_TO_WEAK_AREA: Record<string, string> = {
  speaking_nervous: 'Konuşma özgüveni',
  speaking_pause: 'Akıcılık',
  speaking_linking: 'Kelime bağlama',
  listening_fast: 'Hızlı dinleme',
  listening_media: 'Medya anlama',
  listening_native: 'Native hız',
  pronunciation_th: 'th sesi',
  pronunciation_wv: 'w / v farkı',
  pronunciation_rhythm: 'Ritim ve vurgu',
  pronunciation_endings: 'Kelime sonları',
};

/** Map onboarding challenge ids to human-readable weak areas. */
export function mapChallengesToWeakAreas(challengeIds: string[]): string[] {
  const mapped = challengeIds
    .map((id) => CHALLENGE_TO_WEAK_AREA[id])
    .filter((v): v is string => !!v);
  return [...new Set(mapped)];
}

export function calculateNativeScore(parts: NativeScoreParts): number {
  const raw =
    parts.pronunciationScore * 0.4 +
    parts.fluencyScore * 0.3 +
    parts.rhythmScore * 0.2 +
    parts.confidenceScore * 0.1;
  return Math.round(Math.min(100, Math.max(0, raw)));
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
  return Math.min(96, Math.max(52, base + n - Math.floor(spread / 2)));
}

export function getAccessibleLessons(
  userProfile: UserLearningProfile,
  allLessons: Lesson[],
): Lesson[] {
  const safeProfile = normalizeLearningProfile(userProfile);
  return ensureLessonArray(allLessons).filter(
    (lesson) => safeProfile.premium || !resolveLessonPremium(lesson),
  );
}

export function getLockedPremiumLessons(
  userProfile: UserLearningProfile,
  allLessons: Lesson[],
): Lesson[] {
  const safeProfile = normalizeLearningProfile(userProfile);
  if (safeProfile.premium) return [];
  return ensureLessonArray(allLessons).filter((lesson) => resolveLessonPremium(lesson));
}

function getPreferredCategories(profile: UserLearningProfile): Set<LessonCategory> {
  const safeProfile = normalizeLearningProfile(profile);
  const categories = new Set<LessonCategory>();
  for (const goal of safeProfile.goals) {
    for (const cat of GOAL_TO_CATEGORIES[goal] ?? ['daily']) {
      categories.add(cat);
    }
  }
  if (categories.size === 0) categories.add('daily');
  return categories;
}

function scoreLessonForProfile(lesson: Lesson, profile: UserLearningProfile): number {
  try {
    const validation = validateLessonForRecommendation(lesson);
    if (!validation.valid) {
      logSkippedMalformedLesson(lesson?.id, validation.reason);
      return 0;
    }

    const safeProfile = normalizeLearningProfile(profile);
    let score = 0;
    const allowedLevels =
      LEVEL_TO_LESSON_LEVELS[safeProfile.level] ?? LEVEL_TO_LESSON_LEVELS.intermediate;
    const preferredCategories = getPreferredCategories(safeProfile);
    const focusSkill = getSafeLessonField(lesson.focusSkill).toLowerCase();
    const learningObjective = getSafeLessonField(lesson.learningObjectiveTr).toLowerCase();
    const title = getSafeLessonField(lesson.title).toLowerCase();

    if (allowedLevels.includes(lesson.level)) score += 30;
    else score += 8;

    if (lesson.category && preferredCategories.has(lesson.category)) score += 28;

    if (!safeProfile.completedLessonIds.includes(lesson.id)) score += 22;
    else score += 4;

    for (const weak of safeProfile.weakAreas) {
      const weakLower = getSafeLessonField(weak).toLowerCase();
      if (
        focusSkill.includes(weakLower) ||
        learningObjective.includes(weakLower) ||
        title.includes(weakLower)
      ) {
        score += 12;
      }
    }

    if (
      lesson.type === 'pronunciation_drill' &&
      safeProfile.weakAreas.some((w) => w.includes('telaffuz') || w.includes('th'))
    ) {
      score += 10;
    }

    if (lesson.type === 'sentence_practice') score += 4;

    score -= hashSeed(lesson.id + safeProfile.userId) % 5;
    return score;
  } catch (error) {
    if (__DEV__) {
      console.warn('[EchoSpeak Recommendations] scoreLessonForProfile failed', {
        lessonId: lesson?.id,
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
    return 0;
  }
}

function buildSessionSubtitle(_profile: UserLearningProfile, focusSkill: string): string {
  return `${focusSkill} odağında kısa shadowing pratikleri`;
}

function buildSessionTitle(): string {
  return 'Bugünün Shadowing Görevi';
}

function estimateSessionMinutes(lessonIds: string[], allLessons: Lesson[], dailyMinutes: number): number {
  const minutes = lessonIds.reduce((sum, id) => {
    const lesson = allLessons.find((l) => l.id === id);
    return sum + (lesson?.estimatedMinutes ?? 3);
  }, 0);
  return Math.min(dailyMinutes, Math.max(5, minutes));
}

function pickDailyLessonIds(profile: UserLearningProfile, allLessons: Lesson[]): string[] {
  const safeProfile = normalizeLearningProfile(profile);
  const accessible = getAccessibleLessons(safeProfile, allLessons);
  const ranked = [...accessible].sort(
    (a, b) => scoreLessonForProfile(b, safeProfile) - scoreLessonForProfile(a, safeProfile),
  );

  const picked: Lesson[] = [];
  const usedCategories = new Set<LessonCategory>();

  for (const lesson of ranked) {
    if (picked.length >= DAILY_LESSON_COUNT) break;
    if (picked.some((p) => p.id === lesson.id)) continue;

    const categoryFull = picked.filter((p) => p.category === lesson.category).length >= 2;
    if (categoryFull && usedCategories.has(lesson.category) && ranked.length > DAILY_LESSON_COUNT + 2) {
      continue;
    }

    picked.push(lesson);
    usedCategories.add(lesson.category);
  }

  if (picked.length < DAILY_LESSON_COUNT) {
    for (const lesson of ranked) {
      if (picked.length >= DAILY_LESSON_COUNT) break;
      if (!picked.some((p) => p.id === lesson.id)) picked.push(lesson);
    }
  }

  return picked.slice(0, DAILY_LESSON_COUNT).map((l) => l.id);
}

export function selectDailyPracticeSession(
  userProfile: UserLearningProfile,
  allLessons: Lesson[],
  dateKey?: string,
): DailyPracticeSession {
  const safeProfile = normalizeLearningProfile(userProfile);
  const now = new Date();
  const date =
    dateKey ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const sessionId = `daily-${date.replace(/-/g, '')}`;

  const lessonIds = pickDailyLessonIds(safeProfile, allLessons);
  const firstLesson = allLessons.find((l) => l.id === lessonIds[0]);
  const focusSkill =
    firstLesson?.focusSkill ??
    safeProfile.weakAreas[0] ??
    'Doğal konuşma akıcılığı';

  return {
    sessionId,
    date,
    title: buildSessionTitle(),
    subtitle: buildSessionSubtitle(safeProfile, focusSkill),
    estimatedMinutes: estimateSessionMinutes(lessonIds, allLessons, safeProfile.dailyMinutes),
    focusSkill,
    lessonIds,
    currentIndex: 0,
    totalLessons: DAILY_LESSON_COUNT,
    completedLessonIds: [],
    isCompleted: false,
    averageScore: safeProfile.averageScore > 0 ? safeProfile.averageScore : 0,
  };
}

export function getRecommendedLessons(
  userProfile: UserLearningProfile,
  allLessons: Lesson[],
  limit = 3,
): Lesson[] {
  const safeProfile = normalizeLearningProfile(userProfile);
  const validLessons = ensureLessonArray(allLessons).filter((lesson) => {
    const validation = validateLessonForRecommendation(lesson);
    if (!validation.valid) {
      logSkippedMalformedLesson(lesson?.id, validation.reason);
      return false;
    }
    return true;
  });

  const accessible = getAccessibleLessons(safeProfile, validLessons);
  return [...accessible]
    .sort((a, b) => scoreLessonForProfile(b, safeProfile) - scoreLessonForProfile(a, safeProfile))
    .slice(0, limit);
}

export function getContinueLesson(
  userProfile: UserLearningProfile,
  allLessons: Lesson[],
): Lesson {
  const safeProfile = normalizeLearningProfile(userProfile);
  const accessible = getAccessibleLessons(safeProfile, allLessons);
  const incomplete = accessible.filter((l) => !safeProfile.completedLessonIds.includes(l.id));
  if (incomplete.length > 0) {
    return [...incomplete].sort(
      (a, b) => scoreLessonForProfile(b, safeProfile) - scoreLessonForProfile(a, safeProfile),
    )[0];
  }
  const recommended = getRecommendedLessons(safeProfile, allLessons, 1)[0];
  if (recommended) return recommended;

  const fallback = ensureLessonArray(allLessons).find(
    (lesson) => validateLessonForRecommendation(lesson).valid,
  );
  return fallback ?? allLessons[0];
}

function buildNextFocusTr(lesson: Lesson, segment: LessonSegment): string {
  const feedback = lesson.aiFeedbackRules?.exampleFeedbackTr || getExampleFeedback(lesson);
  const quoted = feedback.match(/"([^"]+)"/);
  if (quoted) {
    return `"${quoted[1]}" kısmını tek nefeste söyle. Kelime kelime değil, bağlı bir ritimle tekrar et.`;
  }
  const instruction = getSafeLessonField(segment.shadowingInstructionTr);
  return `${getSafeLessonField(lesson.focusSkill, 'Shadowing')} odağında kal. ${instruction.slice(0, 120)}`;
}

export function generateMockPracticeResult(
  lesson: Lesson,
  segment: LessonSegment,
  mode: PracticeMode,
  sessionId?: string,
): PracticeResult {
  const seed = `${lesson.id}:${segment.id}:${mode}`;
  const keywords = getAllKeywords(lesson);
  const pronunciationScore = seededScore(`${seed}:p`, 74, 18);
  const fluencyScore = seededScore(`${seed}:f`, 68, 20);
  const rhythmScore = seededScore(`${seed}:r`, 71, 18);
  const confidenceScore = seededScore(`${seed}:c`, 70, 16);

  const nativeScore = calculateNativeScore({
    pronunciationScore,
    fluencyScore,
    rhythmScore,
    confidenceScore,
  });

  const correctWords = keywords.slice(0, Math.min(3, keywords.length));
  const wordsToImprove =
    keywords.length > 1
      ? [keywords[keywords.length - 1]]
      : getSafeLessonField(segment.pronunciationTipTr).split(' ').slice(0, 1);

  const weakAreasDetected: string[] = [];
  if (pronunciationScore < 72) weakAreasDetected.push('Telaffuz');
  if (fluencyScore < 72) weakAreasDetected.push('Akıcılık');
  if (rhythmScore < 72) weakAreasDetected.push('Ritim');
  if (confidenceScore < 72) weakAreasDetected.push('Özgüven');

  return {
    resultId: `result-${hashSeed(seed + Date.now())}`,
    lessonId: lesson.id,
    segmentId: segment.id,
    sessionId,
    mode,
    pronunciationScore,
    fluencyScore,
    rhythmScore,
    confidenceScore,
    nativeScore,
    correctWords,
    wordsToImprove,
    weakAreasDetected,
    aiCoachCommentTr: lesson.aiFeedbackRules?.exampleFeedbackTr || getExampleFeedback(lesson),
    nextFocusTr: buildNextFocusTr(lesson, segment),
    createdAt: new Date().toISOString(),
  };
}

function isSameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function isYesterday(dateKey: string, lastDate: string): boolean {
  const d = new Date(dateKey);
  const last = new Date(lastDate);
  d.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const diff = d.getTime() - last.getTime();
  return diff === 86400000;
}

export function updateProgressFromResult(
  userProfile: UserLearningProfile,
  practiceResult: PracticeResult,
): UserLearningProfile {
  const safeProfile = normalizeLearningProfile(userProfile);
  const today = practiceResult.createdAt.slice(0, 10);
  const alreadyCompleted = safeProfile.completedLessonIds.includes(practiceResult.lessonId);
  const lesson = lessons.find((item) => item.id === practiceResult.lessonId);
  const shouldMarkLessonComplete =
    !lesson || isLastLessonSegment(lesson, practiceResult.segmentId);
  const newlyCompletingLesson = shouldMarkLessonComplete && !alreadyCompleted;
  const completedCount = safeProfile.completedLessonIds.length;

  const newAverage = newlyCompletingLesson
    ? completedCount === 0
      ? practiceResult.nativeScore
      : Math.round(
          (safeProfile.averageScore * completedCount + practiceResult.nativeScore) /
            (completedCount + 1),
        )
    : safeProfile.averageScore;

  let currentStreak = safeProfile.currentStreak;
  if (!safeProfile.lastPracticeDate) {
    currentStreak = 1;
  } else if (isSameDay(today, safeProfile.lastPracticeDate)) {
    currentStreak = safeProfile.currentStreak;
  } else if (isYesterday(today, safeProfile.lastPracticeDate)) {
    currentStreak = safeProfile.currentStreak + 1;
  } else {
    currentStreak = 1;
  }

  const completedLessonIds = alreadyCompleted
    ? safeProfile.completedLessonIds
    : shouldMarkLessonComplete
      ? [...safeProfile.completedLessonIds, practiceResult.lessonId]
      : safeProfile.completedLessonIds;

  const weakAreas = [
    ...new Set([...safeProfile.weakAreas, ...(practiceResult.weakAreasDetected ?? [])]),
  ].slice(0, 8);

  return {
    ...safeProfile,
    currentStreak,
    lastPracticeDate: today,
    completedLessonIds,
    averageScore: newAverage,
    bestScore: Math.max(safeProfile.bestScore, practiceResult.nativeScore),
    weakAreas,
  };
}

export function aggregateSessionResults(results: PracticeResult[]): {
  averageScore: number;
  bestSkill: string;
  improveSkill: string;
  completedCount: number;
} {
  if (results.length === 0) {
    return {
      averageScore: 0,
      bestSkill: '—',
      improveSkill: '—',
      completedCount: 0,
    };
  }

  const avg = Math.round(
    results.reduce((s, r) => s + r.nativeScore, 0) / results.length,
  );

  const skillTotals = {
    Telaffuz: results.reduce((s, r) => s + r.pronunciationScore, 0) / results.length,
    Akıcılık: results.reduce((s, r) => s + r.fluencyScore, 0) / results.length,
    Ritim: results.reduce((s, r) => s + r.rhythmScore, 0) / results.length,
    Özgüven: results.reduce((s, r) => s + r.confidenceScore, 0) / results.length,
  };

  const sorted = Object.entries(skillTotals).sort((a, b) => b[1] - a[1]);
  const bestSkill = sorted[0]?.[0] ?? 'Telaffuz';
  const improveSkill = sorted[sorted.length - 1]?.[0] ?? 'Akıcılık';

  return {
    averageScore: avg,
    bestSkill,
    improveSkill,
    completedCount: results.length,
  };
}

export function getLessonIdForPractice(session: DailyPracticeSession, index: number): string {
  return session.lessonIds[index] ?? session.lessonIds[0];
}
