import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootScreenProps } from '../navigation/types';
import { AppButton, AppCard, ScreenContainer } from '../components';
import { useLearning } from '../context/LearningContext';
import { aggregateSessionResults } from '../data/learningAlgorithm';
import { colors, spacing, typography, borderRadius } from '../theme';

type Props = RootScreenProps<'DailyPracticeSummary'>;

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <AppCard style={styles.statCard}>
      <View style={styles.statTop}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </AppCard>
  );
}

export function DailyPracticeSummaryScreen({ navigation, route }: Props) {
  const { getSession, getResultsForSession, finishDailySession } = useLearning();
  const { sessionId } = route.params;

  const session = getSession(sessionId);
  const results = getResultsForSession(sessionId);
  const stats = useMemo(() => aggregateSessionResults(results), [results]);

  useEffect(() => {
    finishDailySession(sessionId);
  }, [finishDailySession, sessionId]);

  const completedCount = stats.completedCount || session?.completedLessonIds.length || 3;
  const averageScore = stats.averageScore || session?.averageScore || 0;
  const estimatedMinutes = session?.estimatedMinutes ?? 5;

  return (
    <ScreenContainer
      footerCompact
      footerBorderless
      footer={
        <View style={styles.footerBar}>
          <AppButton
            title="Ana sayfaya dön"
            size="compact"
            elevated
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            style={styles.primary}
          />
          <AppButton
            title="Kütüphaneden devam et"
            variant="outline"
            size="compact"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Categories' })}
            style={styles.secondary}
          />
        </View>
      }
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <LinearGradient
        colors={['rgba(91, 95, 239, 0.22)', 'rgba(139, 92, 246, 0.12)', 'rgba(15, 16, 32, 0.0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGlow}
      >
        <View style={styles.headerIcon}>
          <Ionicons name="checkmark" size={18} color={colors.textPrimary} />
        </View>
        <Text style={styles.title}>Bugünkü pratiğin tamamlandı</Text>
        <Text style={styles.subtitle}>
          {session?.subtitle ?? 'Harika iş! Bugün İngilizce konuşma pratiğini tamamladın.'}
        </Text>
      </LinearGradient>

      <View style={styles.grid}>
        <SummaryStat
          label="Tamamlanan pratik"
          value={String(completedCount)}
          icon="flash-outline"
        />
        <SummaryStat
          label="Toplam süre"
          value={`${estimatedMinutes} dk`}
          icon="time-outline"
        />
        <SummaryStat
          label="Ortalama skor"
          value={averageScore > 0 ? String(averageScore) : '—'}
          icon="stats-chart-outline"
        />
        <SummaryStat label="En iyi alan" value={stats.bestSkill} icon="sparkles-outline" />
        <SummaryStat
          label="Geliştirilecek alan"
          value={stats.improveSkill}
          icon="trending-up-outline"
        />
      </View>

      <AppCard style={styles.messageCard}>
        <Text style={styles.messageTitle}>Bugünün mesajı</Text>
        <Text style={styles.messageBody}>
          {results[results.length - 1]?.nextFocusTr ??
            'Bugün amaç mükemmel konuşmak değildi; İngilizce ritmine alışmak ve sesini kullanmaktı.'}
        </Text>
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  headerGlow: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    backgroundColor: 'rgba(26, 27, 46, 0.6)',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    fontSize: 22,
    lineHeight: 28,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    padding: spacing.md,
    width: '48%',
    minHeight: 84,
    justifyContent: 'space-between',
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  messageCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderColor: 'rgba(91, 95, 239, 0.18)',
    borderWidth: 1,
    backgroundColor: 'rgba(91, 95, 239, 0.05)',
  },
  messageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  messageBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primary: {
    flex: 1.15,
  },
  secondary: {
    flex: 1,
  },
});
