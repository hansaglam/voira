import type { RecommendedLesson } from '../services/recommendations/recommendationTypes';

const RECOMMENDATION_MATCH_THRESHOLD = 85;
const LOW_MATCH_FOCUS_THRESHOLD = 55;

const GENERIC_FOCUS_PATTERNS = [
  /aynı dersi tekrar/i,
  /belirgin bir zayıf alan bulunamadı/i,
  /akıcılığını güçlendir/i,
  /^ritme odaklan\.?$/i,
  /^önce kısa bölümler halinde/i,
  /^ritmi hedef cümleyle benzer tutmayı dene\.?$/i,
  /^bir sonraki denemede cümleyi tamamlamaya odaklan\.?$/i,
];

const GENERIC_RECOMMENDATION_PATTERNS = [
  /belirgin bir zayıf alan bulunamadı/i,
  /aynı dersi tekrar ederek akıcılığını/i,
];

export interface AnalysisFocusInput {
  nextFocusTr?: string;
  missingWordCount: number;
  improveWordCount: number;
  matchScore: number;
  weakAreaCount: number;
}

export function isGenericFocusText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return GENERIC_FOCUS_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function resolveFocusDisplayText(input: AnalysisFocusInput): string | null {
  const { missingWordCount, improveWordCount, matchScore, weakAreaCount } = input;
  const rawFocus = input.nextFocusTr?.trim() ?? '';

  if (missingWordCount > 0) {
    return 'Eksik kalan kelimeleri tamamla.';
  }

  if (improveWordCount > 0) {
    return 'Geliştirilecek kelimeleri daha net söyle.';
  }

  if (matchScore < LOW_MATCH_FOCUS_THRESHOLD) {
    return 'Cümleyi kısa parçalara bölerek tekrar söyle.';
  }

  if (rawFocus.startsWith('Öncelik:') && weakAreaCount > 0) {
    return rawFocus;
  }

  if (rawFocus && !isGenericFocusText(rawFocus) && rawFocus.length >= 18) {
    return rawFocus;
  }

  return null;
}

export function shouldShowRecommendations(input: {
  recommendations: RecommendedLesson[];
  missingWordCount: number;
  improveWordCount: number;
  matchScore: number;
  weakAreaCount: number;
}): boolean {
  if (input.recommendations.length === 0) return false;

  const hasActionableIssue =
    input.weakAreaCount > 0 ||
    input.missingWordCount > 0 ||
    input.improveWordCount > 0 ||
    input.matchScore < RECOMMENDATION_MATCH_THRESHOLD;

  if (!hasActionableIssue) return false;

  const hasUsefulRecommendation = input.recommendations.some(
    (item) => !isGenericRecommendationReason(item.reasonTr),
  );

  return hasUsefulRecommendation;
}

function isGenericRecommendationReason(reasonTr: string): boolean {
  const trimmed = reasonTr.trim();
  if (!trimmed) return true;
  return GENERIC_RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function filterActionableRecommendations(
  recommendations: RecommendedLesson[],
): RecommendedLesson[] {
  return recommendations.filter((item) => !isGenericRecommendationReason(item.reasonTr));
}
