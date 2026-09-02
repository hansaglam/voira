import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TabScreenProps } from '../navigation/types';
import { ScreenContainer } from '../components';
import {
  HomeHeader,
  SpeakingSnapshot,
  TodayPracticeHero,
  HomeCoachInsightCard,
  WeakWordsPreview,
  ContinueLearningCard,
  WeeklyProgressPreview,
  ContextualPremiumCard,
  RoleplayRecommendationCard,
} from '../components/home';
import { useUser } from '../context/UserContext';
import { usePremium } from '../context/PremiumContext';
import { useAuth } from '../context/AuthContext';
import { isRegisteredUser } from '../utils/authAccess';
import { getUserDisplayName } from '../utils/userDisplayName';
import { useLearning } from '../context/LearningContext';
import {
  getContinueLessonEntry,
  openLessonFromLibrary,
} from '../data/lessonLibrary';
import { lessons } from '../data/lessons';
import { getAllPracticeResults } from '../data/learningSessionStore';
import {
  buildHomeCoachInsight,
  buildHomeSpeakingSnapshot,
  buildHomeWeeklyProgress,
  recommendTodayPractice,
  shouldShowHomePremiumTeaser,
  type TodayPracticeReason,
} from '../services/home';
import { useWeakWordsCatalog, buildHomeWeakWordsPreviewItems } from '../hooks/useWeakWordsCatalog';
import { trackHomeEvent } from '../services/analytics/homeAnalytics';
import { recommendRoleplayScenario, resolveRoleplayAccess } from '../services/roleplay';
import { trackRoleplayEvent } from '../services/analytics/roleplayAnalytics';
import { useWeeklyChallenge } from '../hooks/useWeeklyChallenge';
import { WeeklyChallengeCard } from '../components/weeklyChallenge/WeeklyChallengeCard';
import { localizedLessonFocus, localizedLessonTitle } from '../utils/lessonLocalization';

type Props = TabScreenProps<'Home'>;

function timeOfDayGreetingKey(now = new Date()): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  const hour = now.getHours();
  if (hour < 12) return 'greetingMorning';
  if (hour < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

function focusLabelKey(
  priorities: string[],
): 'focusFluency' | 'focusPronunciation' | 'focusConfidence' | 'focusSpeaking' {
  if (priorities.includes('fluency')) return 'focusFluency';
  if (priorities.includes('pronunciation')) return 'focusPronunciation';
  if (priorities.includes('confidence')) return 'focusConfidence';
  return 'focusSpeaking';
}

export function HomeScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { pendingFirstLesson, clearPendingFirstLesson, speakingPriorities, primaryGoal } =
    useUser();
  const { isPremium } = usePremium();
  const { user, isGuest } = useAuth();
  const registered = isRegisteredUser(user);
  const openedPendingLessonRef = useRef(false);
  const homeViewedRef = useRef(false);
  const { learningProfile, lastLessonState, isLearningHydrated, getDailySession } = useLearning();
  const { challenge: weeklyChallenge } = useWeeklyChallenge();

  const practiceResults = useMemo(() => getAllPracticeResults(), [
    learningProfile.averageScore,
    learningProfile.completedLessonIds,
    learningProfile.currentStreak,
    learningProfile.lastPracticeDate,
    isLearningHydrated,
  ]);

  const showPremiumTeaser = shouldShowHomePremiumTeaser({
    isPremium,
    analyzedPracticeCount: practiceResults.length,
  });

  const recommendation = useMemo(
    () =>
      recommendTodayPractice({
        profile: {
          ...learningProfile,
          speakingPriorities:
            learningProfile.speakingPriorities?.length
              ? learningProfile.speakingPriorities
              : speakingPriorities,
          goals:
            learningProfile.goals?.length
              ? learningProfile.goals
              : primaryGoal
                ? [primaryGoal]
                : learningProfile.goals,
        },
        lessons,
        practiceResults,
        lastLessonState,
      }),
    [lastLessonState, learningProfile, practiceResults, primaryGoal, speakingPriorities],
  );

  const snapshot = useMemo(
    () =>
      buildHomeSpeakingSnapshot({
        profile: learningProfile,
        practiceResults,
      }),
    [learningProfile, practiceResults],
  );

  const { activeWords, queue, catalog } = useWeakWordsCatalog();

  const coachInsight = useMemo(
    () => buildHomeCoachInsight({ practiceResults, weakWordCatalog: catalog }),
    [practiceResults, catalog],
  );

  const weakWords = useMemo(
    () =>
      buildHomeWeakWordsPreviewItems(activeWords, 3).map((item) => ({
        word: item.word,
        score: item.score,
      })),
    [activeWords],
  );

  const weekly = useMemo(
    () =>
      buildHomeWeeklyProgress({
        practiceResults,
        lessons,
      }),
    [practiceResults],
  );

  const continueEntry = useMemo(
    () => getContinueLessonEntry(learningProfile),
    [learningProfile, practiceResults, lastLessonState],
  );

  const roleplayRecommendation = useMemo(
    () => recommendRoleplayScenario({
      level: learningProfile.level,
      goal: primaryGoal ?? learningProfile.goals?.[0],
      detectedFocusAreas: learningProfile.weakAreas as never,
      isPremium,
    }),
    [isPremium, learningProfile.goals, learningProfile.level, learningProfile.weakAreas, primaryGoal],
  );
  const roleplayAccess = resolveRoleplayAccess({
    isGuest,
    isPremium,
    scenarioPremium: roleplayRecommendation.premium,
  });

  const showContinue =
    Boolean(continueEntry.lesson) &&
    recommendation.lesson?.id !== continueEntry.lesson.id &&
    !learningProfile.completedLessonIds.includes(continueEntry.lesson.id) &&
    (Boolean(lastLessonState?.lessonId) ||
      practiceResults.some((result) => result.lessonId === continueEntry.lesson.id));

  const displayName = getUserDisplayName({
    user,
    localName: learningProfile.name,
    isGuest,
  });

  const greetingBase = t(`home.${timeOfDayGreetingKey()}`);
  const greeting = displayName
    ? t('home.greetingNamed', { greeting: greetingBase, name: displayName })
    : t('home.greetingGeneric', { greeting: greetingBase });

  const greetingSub = t('home.greetingSubPersonalized', {
    minutes: learningProfile.dailyMinutes,
    focus: t(`home.${focusLabelKey(speakingPriorities)}`),
  });

  const translateReason = useCallback(
    (reason: TodayPracticeReason): string => {
      const priority =
        reason.params?.priority != null
          ? t(`home.priority_${reason.params.priority}`)
          : undefined;
      const goal =
        reason.params?.goal != null ? t(`home.goal_${reason.params.goal}`, {
          defaultValue: reason.params.goal,
        }) : undefined;
      return t(`home.reason_${reason.id}`, {
        priority,
        goal,
        weakArea: reason.params?.weakArea,
      });
    },
    [t],
  );

  const coachBody = useMemo(() => {
    const skill =
      coachInsight.params?.skill != null
        ? t(`home.skill_${coachInsight.params.skill}`)
        : undefined;
    return t(`home.coach_${coachInsight.kind}`, {
      word: coachInsight.params?.word,
      skill,
    });
  }, [coachInsight, t]);

  useEffect(() => {
    if (!isLearningHydrated || homeViewedRef.current) return;
    homeViewedRef.current = true;
    trackHomeEvent('home_viewed', {
      hasHistory: practiceResults.length > 0,
      isPremium,
    });
  }, [isLearningHydrated, isPremium, practiceResults.length]);

  useEffect(() => {
    if (!pendingFirstLesson || openedPendingLessonRef.current) {
      return;
    }

    openedPendingLessonRef.current = true;
    const lessonParams = pendingFirstLesson;
    clearPendingFirstLesson();

    const task = InteractionManager.runAfterInteractions(() => {
      navigation.navigate('Lesson', lessonParams);
    });

    return () => {
      task.cancel();
    };
  }, [clearPendingFirstLesson, navigation, pendingFirstLesson]);

  const openTodayPractice = useCallback(() => {
    if (!recommendation.lesson) return;
    trackHomeEvent('today_practice_started', {
      lessonId: recommendation.lesson.id,
      reason: recommendation.reason.id,
    });
    openLessonFromLibrary(
      navigation,
      recommendation.lesson,
      isPremium,
      registered,
      recommendation.lesson.category,
    );
  }, [isPremium, navigation, recommendation, registered]);

  const levelLabel =
    recommendation.level != null
      ? t(`home.level_${recommendation.level}`, {
          defaultValue: recommendation.level,
        })
      : null;

  const todayMeta =
    levelLabel != null
      ? t('home.todayMeta', {
          minutes: recommendation.durationMinutes,
          level: levelLabel,
        })
      : t('home.todayMetaMinutes', { minutes: recommendation.durationMinutes });

  return (
    <ScreenContainer withTabBar>
      <HomeHeader
        greeting={greeting}
        subtitle={greetingSub}
        showPremiumBadge={!isPremium}
        premiumBadgeLabel={t('home.plusBadge')}
        onPressPremium={() => {
          trackHomeEvent('home_premium_tapped', { source: 'badge' });
          navigation.navigate('Premium');
        }}
      />

      <SpeakingSnapshot
        snapshot={snapshot}
        labels={{
          streak: t('home.snapshotStreak'),
          average: t('home.snapshotAverage'),
          weekly: t('home.snapshotWeekly'),
          buildingBaseline: t('home.snapshotBuildingBaseline'),
        }}
      />

      <TodayPracticeHero
        eyebrow={t('home.todayEyebrow')}
        title={recommendation.lesson ? localizedLessonTitle(recommendation.lesson, i18n.language) : t('home.todayUnavailableTitle')}
        meta={todayMeta}
        focusLabel={t('home.todayFocus')}
        focusValue={
          recommendation.lesson
            ? localizedLessonFocus(recommendation.lesson, i18n.language)
            : '—'
        }
        reasonLabel={t('home.todayReason')}
        reasonText={
          recommendation.lesson
            ? translateReason(recommendation.reason)
            : t('home.todayUnavailableReason')
        }
        ctaLabel={t('home.todayCta')}
        disabled={!recommendation.lesson}
        onPress={openTodayPractice}
      />

      <HomeCoachInsightCard
        title={t('home.coachTitle')}
        body={coachBody}
        onViewed={() =>
          trackHomeEvent('coach_insight_viewed', { kind: coachInsight.kind })
        }
      />

      {weeklyChallenge ? (
        <WeeklyChallengeCard
          challenge={weeklyChallenge}
          source="home"
          onPress={() => {
            if (weeklyChallenge.status === 'completed') { navigation.navigate('WeeklyReport'); return; }
            if (weeklyChallenge.type === 'weak_word_practice') { navigation.navigate('WeakWords'); return; }
            if (weeklyChallenge.type === 'roleplay_sessions') { navigation.navigate('RoleplayDiscover'); return; }
            if (weeklyChallenge.type === 'retry_improvement') {
              const latest = [...practiceResults]
                .filter((result) => result.lessonId && result.segmentId)
                .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
              if (latest?.segmentId) {
                navigation.navigate('Lesson', {
                  lessonId: latest.lessonId,
                  segmentId: latest.segmentId,
                  sessionId: latest.sessionId,
                  source: latest.mode === 'daily' ? 'dailySession' : 'library',
                });
                return;
              }
            }
            const session = getDailySession();
            navigation.navigate('DailyPracticeSession', { sessionId: session.sessionId });
          }}
        />
      ) : null}

      <RoleplayRecommendationCard
        eyebrow={t('roleplay.discoverTitle')}
        title={t(roleplayRecommendation.titleKey)}
        description={t(roleplayRecommendation.descriptionKey)}
        meta={`${t(`roleplay.difficulty.${roleplayRecommendation.difficulty}`)} · ${t('roleplay.minutes', { count: roleplayRecommendation.estimatedMinutes })}`}
        cta={roleplayAccess.allowed ? t('roleplay.start') : t('roleplay.premiumBadge')}
        locked={!roleplayAccess.allowed}
        onPress={() => {
          trackRoleplayEvent('roleplay_scenario_selected', {
            scenarioId: roleplayRecommendation.id,
            level: roleplayRecommendation.difficulty,
            accessTier: roleplayAccess.tier,
          });
          if (!roleplayAccess.allowed) {
            navigation.navigate('Premium');
            return;
          }
          navigation.navigate('RoleplaySession', { scenarioId: roleplayRecommendation.id });
        }}
      />

      <WeakWordsPreview
        title={t('home.weakWordsTitle')}
        items={weakWords}
        ctaLabel={t('weakWords.startPractice')}
        onPressSection={() => {
          trackHomeEvent('weak_words_preview_tapped', { count: weakWords.length });
          navigation.navigate('WeakWords');
        }}
        onPressCta={() => {
          trackHomeEvent('weak_words_preview_tapped', { count: weakWords.length });
          if (queue.isEmpty || queue.items.length === 0) {
            navigation.navigate('WeakWords');
            return;
          }
          const first = queue.items[0];
          navigation.navigate('WeakWordPractice', {
            normalizedWord: first.normalizedWord,
            displayWord: first.displayWord,
            queueWords: queue.items.map((item) => item.normalizedWord),
            queueIndex: 0,
          });
        }}
      />

      {showContinue ? (
        <ContinueLearningCard
          label={t('home.continueLabel')}
          title={localizedLessonTitle(continueEntry.lesson, i18n.language)}
          focus={localizedLessonFocus(continueEntry.lesson, i18n.language)}
          ctaLabel={t('home.continueCta')}
          onPress={() => {
            trackHomeEvent('continue_learning_tapped', {
              lessonId: continueEntry.lesson.id,
            });
            openLessonFromLibrary(
              navigation,
              continueEntry.lesson,
              isPremium,
              registered,
              continueEntry.lesson.category,
              continueEntry.segmentIndex,
            );
          }}
        />
      ) : null}

      <WeeklyProgressPreview
        title={t('home.weeklyTitle')}
        progress={weekly}
        practicesLabel={t('home.weeklyPractices', { n: weekly.practiceCount })}
        minutesLabel={
          weekly.speakingMinutes != null
            ? t('home.weeklyMinutes', { n: weekly.speakingMinutes })
            : null
        }
        averageLabel={
          weekly.averageFrom != null && weekly.averageTo != null
            ? t('home.weeklyAverage', {
                from: weekly.averageFrom,
                to: weekly.averageTo,
              })
            : null
        }
        emptyLabel={t('home.weeklyEmpty')}
        ctaLabel={t('home.weeklyCta')}
        onPress={() => {
          trackHomeEvent('weekly_progress_tapped', {
            practices: weekly.practiceCount,
          });
          navigation.navigate('WeeklyReport');
        }}
      />

      {showPremiumTeaser ? (
        <ContextualPremiumCard
          title={t('home.premiumTitle')}
          subtitle={t('home.premiumSub')}
          bullets={[
            t('home.premiumBullet1'),
            t('home.premiumBullet2'),
            t('home.premiumBullet3'),
          ]}
          ctaLabel={t('home.premiumCta')}
          onPress={() => {
            trackHomeEvent('home_premium_tapped', { source: 'teaser' });
            navigation.navigate('Premium');
          }}
        />
      ) : null}
    </ScreenContainer>
  );
}
