import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RootScreenProps } from '../navigation/types';
import { AppButton, ScreenContainer } from '../components';
import { getAllPracticeResults } from '../data/learningSessionStore';
import {
  buildWeakWordCatalog,
  recordWeakWordPracticeOutcome,
  resolveWeakWordStatus,
} from '../services/weakWords';
import { getWeakWordsMemoryState } from '../services/weakWords/weakWordStorage';
import { rebuildCanonicalWeakWordAggregates } from '../services/sync/weakWordAggregateMerge';
import { trackWeakWordsEvent } from '../services/analytics/weakWordsAnalytics';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius } from '../theme';
import type { WeakWordStatus } from '../types/weakWords';

type Props = RootScreenProps<'WeakWordPracticeResult'>;

function statusLabelKey(status: WeakWordStatus): string {
  return `weakWords.status_${status}`;
}

export function WeakWordPracticeResultScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { isGuest } = useAuth();
  const {
    displayWord,
    normalizedWord,
    accuracyScore,
    issueType,
    coachingHint,
    previousWeakScore,
    queueWords = [],
    queueIndex = 0,
  } = route.params;

  const practiceResults = getAllPracticeResults();
  const [resolvedStatus, setResolvedStatus] = useState<WeakWordStatus>('new');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const aggregatesBefore = rebuildCanonicalWeakWordAggregates({
        practiceResults,
        practiceRecords: getWeakWordsMemoryState().practiceRecords,
        remoteAggregates: getWeakWordsMemoryState().remoteAggregates,
      });
      const aggregateBefore = aggregatesBefore.find(
        (item) => item.normalizedWord === normalizedWord,
      );
      const priorStatus = aggregateBefore
        ? resolveWeakWordStatus({
            aggregate: aggregateBefore,
            practiceRecords: getWeakWordsMemoryState().practiceRecords,
          })
        : null;

      await recordWeakWordPracticeOutcome({
        displayWord,
        accuracyScore,
        issueType,
        practiceResults,
      });

      if (cancelled) return;

      const catalog = buildWeakWordCatalog(
        rebuildCanonicalWeakWordAggregates({
          practiceResults,
          practiceRecords: getWeakWordsMemoryState().practiceRecords,
          remoteAggregates: getWeakWordsMemoryState().remoteAggregates,
        }),
        getWeakWordsMemoryState().practiceRecords,
      );
      const item = catalog.find((entry) => entry.normalizedWord === normalizedWord);
      const nextStatus = item?.status ?? 'new';
      setResolvedStatus(nextStatus);

      trackWeakWordsEvent('weak_word_attempt_completed', {
        status: nextStatus,
        scoreBand:
          accuracyScore >= 78 ? 'healthy' : accuracyScore >= 70 ? 'borderline' : 'weak',
        queuePosition: queueIndex,
        guest: isGuest,
      });

      if (priorStatus && priorStatus !== nextStatus) {
        trackWeakWordsEvent('weak_word_status_changed', {
          status: nextStatus,
          guest: isGuest,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    accuracyScore,
    displayWord,
    isGuest,
    issueType,
    normalizedWord,
    practiceResults,
    queueIndex,
  ]);

  const delta =
    typeof previousWeakScore === 'number'
      ? Math.round(accuracyScore - previousWeakScore)
      : null;

  const nextWord = queueWords[queueIndex + 1];

  const handleRetry = () => {
    trackWeakWordsEvent('weak_word_retry_tapped', { queuePosition: queueIndex, guest: isGuest });
    navigation.replace('WeakWordPractice', {
      normalizedWord,
      displayWord,
      queueWords,
      queueIndex,
    });
  };

  const handleNext = () => {
    trackWeakWordsEvent('weak_word_next_tapped', {
      queuePosition: queueIndex + 1,
      guest: isGuest,
    });
    if (!nextWord) {
      navigation.navigate('WeakWords');
      return;
    }
    const catalog = buildWeakWordCatalog(
      rebuildCanonicalWeakWordAggregates({
        practiceResults,
        practiceRecords: getWeakWordsMemoryState().practiceRecords,
        remoteAggregates: getWeakWordsMemoryState().remoteAggregates,
      }),
      getWeakWordsMemoryState().practiceRecords,
    );
    const target = catalog.find((item) => item.normalizedWord === nextWord);
    navigation.replace('WeakWordPractice', {
      normalizedWord: nextWord,
      displayWord: target?.displayWord ?? nextWord,
      queueWords,
      queueIndex: queueIndex + 1,
    });
  };

  const handleDone = () => {
    navigation.navigate('WeakWords');
  };

  return (
    <ScreenContainer withPersistentTabBar activeTab="Home">
      <Text style={styles.word}>{displayWord}</Text>
      <Text style={styles.score}>{Math.round(accuracyScore)}</Text>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{t(statusLabelKey(resolvedStatus))}</Text>
      </View>

      {typeof previousWeakScore === 'number' ? (
        <Text style={styles.previous}>
          {t('weakWords.previousWeakScore', { score: Math.round(previousWeakScore) })}
        </Text>
      ) : null}

      {delta != null && delta !== 0 ? (
        <Text style={[styles.delta, delta > 0 ? styles.deltaUp : styles.deltaDown]}>
          {delta > 0 ? `+${delta}` : `${delta}`}
        </Text>
      ) : null}

      {coachingHint ? <Text style={styles.hint}>{coachingHint}</Text> : null}

      <View style={styles.actions}>
        <AppButton title={t('weakWords.tryAgain')} onPress={handleRetry} variant="outline" />
        {nextWord ? (
          <AppButton title={t('weakWords.nextWord')} onPress={handleNext} />
        ) : (
          <AppButton title={t('weakWords.done')} onPress={handleDone} />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  word: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  score: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91, 95, 239, 0.25)',
    marginBottom: spacing.md,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  previous: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  delta: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  deltaUp: {
    color: colors.success,
  },
  deltaDown: {
    color: colors.warning,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
