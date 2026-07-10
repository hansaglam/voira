import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootScreenProps } from '../navigation/types';
import { AppButton, AppCard, ScreenContainer } from '../components';
import { useLearning } from '../context/LearningContext';
import { colors, spacing, typography, borderRadius } from '../theme';

type Props = RootScreenProps<'DailyPracticeSession'>;

export function DailyPracticeSessionScreen({ navigation, route }: Props) {
  const { getDailySession, getSession } = useLearning();
  const sessionId = route.params?.sessionId;
  const session = sessionId ? getSession(sessionId) ?? getDailySession() : getDailySession();
  const total = session.totalLessons;
  const firstLessonId = session.lessonIds[0];
  const hasLessons = session.lessonIds.length > 0;

  const handleStartPractice = () => {
    if (!hasLessons || !firstLessonId) {
      navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }

    navigation.navigate('Lesson', {
      lessonId: firstLessonId,
      source: 'dailySession',
      sessionId: session.sessionId,
      practiceIndex: 0,
      totalLessons: session.totalLessons,
    });
  };

  return (
    <ScreenContainer>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <LinearGradient
        colors={['rgba(79, 70, 229, 0.95)', 'rgba(99, 102, 241, 0.7)', 'rgba(139, 92, 246, 0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="mic" size={20} color={colors.textPrimary} />
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Bugünkü görev</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>{session.title}</Text>
        <Text style={styles.heroSubtitle}>{session.subtitle}</Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaPill}>
            <Ionicons name="flash-outline" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroMetaText}>{total} kısa pratik</Text>
          </View>
          <View style={styles.heroMetaPill}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroMetaText}>Yaklaşık {session.estimatedMinutes} dakika</Text>
          </View>
        </View>
        <Text style={styles.heroFocus}>Hedef: {session.focusSkill}</Text>
      </LinearGradient>

      {!hasLessons ? (
        <AppCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>Pratik bulunamadı</Text>
          <Text style={styles.infoBody}>
            Bugünkü dersler şu anda hazırlanıyor. Ana sayfaya dönüp daha sonra tekrar deneyebilirsin.
          </Text>
        </AppCard>
      ) : (
        <AppCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>Kısa günlük misyon</Text>
          <Text style={styles.infoBody}>
            3 küçük pratik yapacaksın. Her pratikten sonra analizini görüp devam edeceksin. Sonunda günün
            özetini alacaksın.
          </Text>
        </AppCard>
      )}

      <View style={styles.actions}>
        <AppButton
          title={hasLessons ? 'Bugünkü pratiğe başla' : 'Ana sayfaya dön'}
          size="compact"
          elevated
          onPress={handleStartPractice}
        />
      </View>
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
  hero: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.3,
  },
  heroTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.86)',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  heroMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
  },
  heroFocus: {
    ...typography.captionBright,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  infoCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: spacing.sm,
  },
});
