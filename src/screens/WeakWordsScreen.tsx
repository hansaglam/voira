import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RootScreenProps } from '../navigation/types';
import { ScreenContainer, AppButton } from '../components';
import { WeakWordCard } from '../components/weakWords';
import { useWeakWordsCatalog } from '../hooks/useWeakWordsCatalog';
import { trackWeakWordsEvent } from '../services/analytics/weakWordsAnalytics';
import { colors, spacing } from '../theme';

type Props = RootScreenProps<'WeakWords'>;

export function WeakWordsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { activeWords, improvingWords, masteredWords, queue, profile } = useWeakWordsCatalog();
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackWeakWordsEvent('weak_words_screen_viewed', {
      scoreBand: profile.recentTrend,
    });
    if (activeWords.length === 0) {
      trackWeakWordsEvent('weak_words_empty_state_viewed');
    }
  }, [activeWords.length, profile.recentTrend]);

  const startPractice = (normalizedWord?: string, displayWord?: string) => {
    const target =
      normalizedWord && displayWord
        ? { normalizedWord, displayWord }
        : queue.items[0]
          ? {
              normalizedWord: queue.items[0].normalizedWord,
              displayWord: queue.items[0].displayWord,
            }
          : null;
    if (!target) return;

    trackWeakWordsEvent('weak_word_practice_started', {
      status: queue.items[0]?.status ?? null,
      queuePosition: 0,
    });
    navigation.navigate('WeakWordPractice', {
      normalizedWord: target.normalizedWord,
      displayWord: target.displayWord,
      queueWords: queue.items.map((item) => item.normalizedWord),
      queueIndex: queue.items.findIndex((item) => item.normalizedWord === target.normalizedWord),
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>{t('weakWords.screenTitle')}</Text>
        <Text style={styles.subtitle}>{t(`profileInsights.${profile.insightId}`)}</Text>
      </View>

      <View style={styles.summaryRow}>
        <SummaryChip label={t('weakWords.focusTitle')} value={activeWords.length} />
        <SummaryChip label={t('weakWords.improvingTitle')} value={improvingWords.length} />
        <SummaryChip label={t('weakWords.masteredTitle')} value={masteredWords.length} />
      </View>

      {activeWords.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('weakWords.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('weakWords.emptyBody')}</Text>
          <AppButton
            title={t('weakWords.emptyCta')}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Categories' })}
          />
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>{t('weakWords.focusTitle')}</Text>
          {activeWords.map((item) => (
            <WeakWordCard
              key={item.normalizedWord}
              item={item}
              onPractice={() => startPractice(item.normalizedWord, item.displayWord)}
            />
          ))}

          {improvingWords.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>{t('weakWords.improvingTitle')}</Text>
              {improvingWords.map((item) => (
                <WeakWordCard
                  key={`improving-${item.normalizedWord}`}
                  item={item}
                  onPractice={() => startPractice(item.normalizedWord, item.displayWord)}
                />
              ))}
            </>
          ) : null}

          {masteredWords.length > 0 ? (
            <>
              <Text style={styles.sectionTitleMuted}>{t('weakWords.masteredTitle')}</Text>
              {masteredWords.slice(0, 5).map((item) => (
                <View key={`mastered-${item.normalizedWord}`} style={styles.masteredRow}>
                  <Text style={styles.masteredWord}>{item.displayWord}</Text>
                  <Text style={styles.masteredStatus}>{t('weakWords.status_mastered')}</Text>
                </View>
              ))}
            </>
          ) : null}

          <AppButton
            title={t('weakWords.startPractice')}
            onPress={() => startPractice()}
            style={styles.startCta}
          />
        </>
      )}
    </ScreenContainer>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
  },
  chipValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chipLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitleMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  empty: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  masteredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  masteredWord: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  masteredStatus: {
    fontSize: 12,
    color: colors.textMuted,
  },
  startCta: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
