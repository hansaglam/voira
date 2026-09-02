import { useEffect, useMemo, useState } from 'react';
import { getAllPracticeResults } from '../data/learningSessionStore';
import { useLearning } from '../context/LearningContext';
import { useUser } from '../context/UserContext';
import {
  buildWeakWordCatalog,
  buildWeakWordPracticeQueue,
  buildPersonalSpeakingProfile,
  getWeakWordsMemoryState,
  subscribeWeakWordsStorage,
} from '../services/weakWords';
import { rebuildCanonicalWeakWordAggregates } from '../services/sync/weakWordAggregateMerge';
import type { PersonalSpeakingProfile } from '../types/weakWords';
import { filterWeakWordsByStatus } from '../services/weakWords/weakWordCatalogService';
import { isActiveWeakWordStatus } from '../services/weakWords/weakWordStatusService';

export { buildHomeWeakWordsPreviewItems } from '../services/weakWords/weakWordHomePreviewService';

export function useWeakWordsCatalog() {
  const { learningProfile, isLearningHydrated } = useLearning();
  const { speakingPriorities } = useUser();
  const [storageTick, setStorageTick] = useState(0);

  useEffect(() => subscribeWeakWordsStorage(() => setStorageTick((tick) => tick + 1)), []);

  const practiceResults = useMemo(() => getAllPracticeResults(), [
    learningProfile.averageScore,
    learningProfile.completedLessonIds.length,
    learningProfile.lastPracticeDate,
    isLearningHydrated,
    storageTick,
  ]);

  const aggregates = useMemo(
    () =>
      rebuildCanonicalWeakWordAggregates({
        practiceResults,
        practiceRecords: getWeakWordsMemoryState().practiceRecords,
        remoteAggregates: getWeakWordsMemoryState().remoteAggregates,
      }),
    [practiceResults, storageTick],
  );

  const catalog = useMemo(
    () => buildWeakWordCatalog(aggregates, getWeakWordsMemoryState().practiceRecords),
    [aggregates, storageTick],
  );

  const activeWords = useMemo(
    () => catalog.filter((item) => isActiveWeakWordStatus(item.status)),
    [catalog],
  );

  const improvingWords = useMemo(
    () => filterWeakWordsByStatus(catalog, ['improving']),
    [catalog],
  );

  const masteredWords = useMemo(
    () => filterWeakWordsByStatus(catalog, ['mastered']),
    [catalog],
  );

  const queue = useMemo(() => buildWeakWordPracticeQueue(catalog), [catalog]);

  const profile: PersonalSpeakingProfile = useMemo(
    () =>
      buildPersonalSpeakingProfile({
        practiceResults,
        weakWordCatalog: catalog,
        userPriorities:
          learningProfile.speakingPriorities?.length
            ? learningProfile.speakingPriorities
            : speakingPriorities,
        hasTodayPlan: true,
      }),
    [practiceResults, catalog, learningProfile.speakingPriorities, speakingPriorities],
  );

  return {
    catalog,
    activeWords,
    improvingWords,
    masteredWords,
    queue,
    profile,
    practiceResults,
    aggregates,
  };
}
