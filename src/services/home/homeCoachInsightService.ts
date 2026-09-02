import type { PracticeResult } from '../../types/learning';
import type { WeakWordItem } from '../../types/weakWords';
import type { HomeCoachInsight } from './homeTypes';
import { buildPersonalSpeakingProfile } from '../profile/personalSpeakingProfileService';
import { resolvePrimaryCurrentFocus } from '../profile/nextSpeakingFocusService';
import { filterProfilePracticeResults } from '../profile/profileEvidenceService';

function collectPersistentWeakWords(
  results: PracticeResult[],
): Array<{ word: string; count: number; lastScore: number }> {
  const byWord = new Map<string, { word: string; count: number; lastScore: number }>();

  for (const result of results) {
    const events =
      result.pronunciationWeakEvents?.map((event) => ({
        word: event.word,
        score: event.score ?? result.pronunciationScore,
      })) ??
      result.wordsToImprove.map((word) => ({
        word,
        score: result.pronunciationScore,
      }));

    for (const event of events) {
      const key = event.word.trim().toLocaleLowerCase('en-US');
      if (!key) continue;
      const prior = byWord.get(key);
      if (!prior) {
        byWord.set(key, {
          word: event.word.trim(),
          count: 1,
          lastScore: event.score,
        });
      } else {
        byWord.set(key, {
          word: prior.word,
          count: prior.count + 1,
          lastScore: event.score,
        });
      }
    }
  }

  return Array.from(byWord.values())
    .filter((item) => item.count >= 2)
    .sort((a, b) => a.lastScore - b.lastScore || b.count - a.count);
}

/**
 * Deterministic Home coach insight — aligned with Personal Speaking Profile focus.
 */
export function buildHomeCoachInsight(input: {
  practiceResults: PracticeResult[];
  weakWordCatalog?: WeakWordItem[];
}): HomeCoachInsight {
  const results = filterProfilePracticeResults(input.practiceResults);

  if (results.length === 0) {
    return { kind: 'new_user' };
  }

  if (results.length < 3) {
    return { kind: 'low_activity' };
  }

  const weakWords = collectPersistentWeakWords(results);
  if (weakWords[0]) {
    return {
      kind: 'weak_word',
      params: { word: weakWords[0].word },
    };
  }

  const profile = buildPersonalSpeakingProfile({
    practiceResults: results,
    weakWordCatalog: input.weakWordCatalog ?? [],
  });

  if (profile.recentTrend === 'improving') {
    const focus = resolvePrimaryCurrentFocus(profile);
    if (focus === 'fluency' || focus === 'pronunciation') {
      return { kind: 'improving_trend', params: { skill: focus } };
    }
    return { kind: 'improving_trend', params: { skill: 'pronunciation' } };
  }

  const focus = resolvePrimaryCurrentFocus(profile);
  if (focus === 'fluency' || focus === 'pronunciation') {
    return { kind: 'weakest_skill', params: { skill: focus } };
  }

  return { kind: 'low_activity' };
}
