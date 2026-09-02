import { useEffect, useMemo, useState } from 'react';
import { useLearning } from '../context/LearningContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useWeakWordsCatalog } from './useWeakWordsCatalog';
import { getOrCreateAnonymousUserId } from '../services/auth/anonymousIdStorage';
import { isRegisteredUser } from '../utils/authAccess';
import { fetchRoleplayActivityRequest } from '../services/roleplay';
import { buildWeeklyReport, getLocalWeeklyWindow, type WeeklyRoleplayActivity } from '../services/weeklyReport';
import { getWeakWordsMemoryState } from '../services/weakWords';
import { selectWeeklyChallenge } from '../services/weeklyChallenge';
import { loadWeeklyChallengeSelection, saveWeeklyChallengeSelection, weeklyChallengeWeekKey, type StoredWeeklyChallengeSelection } from '../services/weeklyChallenge';

export function useWeeklyChallenge() {
  const { learningProfile } = useLearning();
  const { speakingPriorities } = useUser();
  const { user } = useAuth();
  const { practiceResults, catalog, profile } = useWeakWordsCatalog();
  const [roleplays, setRoleplays] = useState<WeeklyRoleplayActivity[]>([]);
  const [stableIdentity, setStableIdentity] = useState<string | null>(isRegisteredUser(user) ? user!.id : null);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [fixedSelection, setFixedSelection] = useState<StoredWeeklyChallengeSelection | null>(null);
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const window = useMemo(() => getLocalWeeklyWindow(), []);

  useEffect(() => {
    if (isRegisteredUser(user)) { setStableIdentity(user!.id); return; }
    let cancelled = false;
    void getOrCreateAnonymousUserId().then((id) => { if (!cancelled) setStableIdentity(id); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setActivityLoaded(false);
    void fetchRoleplayActivityRequest({ from: window.currentStartIso, before: window.currentEndIso, userId: isRegisteredUser(user) ? user!.id : undefined })
      .then((response) => { if (!cancelled && response.ok) setRoleplays(response.sessions); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setActivityLoaded(true); });
    return () => { cancelled = true; };
  }, [user, window.currentEndIso, window.currentStartIso]);

  const report = useMemo(() => buildWeeklyReport({
    practiceResults, weakWordCatalog: catalog, roleplayActivity: roleplays, speakingProfile: profile,
    userPriorities: learningProfile.speakingPriorities?.length ? learningProfile.speakingPriorities : speakingPriorities,
    hasTodayPlan: true,
  }), [catalog, learningProfile.speakingPriorities, practiceResults, profile, roleplays, speakingPriorities]);

  useEffect(() => {
    if (!stableIdentity || !activityLoaded) return;
    let cancelled = false;
    setSelectionLoaded(false);
    const weekKey = weeklyChallengeWeekKey();
    const candidate = selectWeeklyChallenge({ stableIdentity, profile, report, practiceResults, weakWordPracticeRecords: getWeakWordsMemoryState().practiceRecords, canUseRoleplay: true });
    void loadWeeklyChallengeSelection(weekKey, stableIdentity).then(async (stored) => {
      if (cancelled) return;
      const selection = stored ?? { type: candidate.type, target: candidate.target };
      if (!stored) await saveWeeklyChallengeSelection(weekKey, stableIdentity, selection).catch(() => undefined);
      if (!cancelled) { setFixedSelection(selection); setSelectionLoaded(true); }
    });
    return () => { cancelled = true; };
  }, [activityLoaded, practiceResults, profile, report, stableIdentity]);

  const challenge = useMemo(() => {
    if (!stableIdentity || !activityLoaded || !selectionLoaded || !fixedSelection) return null;
    return selectWeeklyChallenge({ stableIdentity, profile, report, practiceResults,
      weakWordPracticeRecords: getWeakWordsMemoryState().practiceRecords, canUseRoleplay: true, fixedSelection });
  }, [activityLoaded, fixedSelection, practiceResults, profile, report, selectionLoaded, stableIdentity]);

  return { challenge, report, isLoading: !challenge };
}
