import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../components';
import type { RootScreenProps } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import { usePremium } from '../context/PremiumContext';
import {
  ROLEPLAY_SCENARIOS,
  recommendRoleplayScenario,
  resolveRoleplayAccess,
} from '../services/roleplay';
import { trackRoleplayEvent } from '../services/analytics/roleplayAnalytics';
import type { RoleplayCategory, RoleplayScenario } from '../types/roleplay';
import { borderRadius, colors, layout, spacing, typography } from '../theme';

type Props = RootScreenProps<'RoleplayDiscover'>;
const CATEGORY_ORDER: RoleplayCategory[] = ['daily', 'travel', 'work', 'social'];

function ScenarioCard({
  scenario,
  recommended = false,
  locked,
  onPress,
}: {
  scenario: RoleplayScenario;
  recommended?: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(scenario.titleKey)}. ${t(`roleplay.difficulty.${scenario.difficulty}`)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, recommended && styles.recommendedCard, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{t(scenario.titleKey)}</Text>
        {locked ? (
          <View style={styles.premiumBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.premium} />
            <Text style={styles.premiumText}>{t('roleplay.premiumBadge')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardDescription}>{t(scenario.descriptionKey)}</Text>
      <Text style={styles.meta}>
        {t(`roleplay.categories.${scenario.category}`)} · {t(`roleplay.difficulty.${scenario.difficulty}`)} · {t('roleplay.minutes', { count: scenario.estimatedMinutes })}
      </Text>
      {recommended ? <Text style={styles.startLabel}>{t('roleplay.start')} →</Text> : null}
    </Pressable>
  );
}

export function RoleplayDiscoverScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isGuest } = useAuth();
  const { isPremium } = usePremium();
  const { learningProfile } = useLearning();
  const recommended = useMemo(
    () => recommendRoleplayScenario({
      level: learningProfile.level,
      goal: learningProfile.goals?.[0],
      detectedFocusAreas: learningProfile.weakAreas as never,
      isPremium,
    }),
    [isPremium, learningProfile.goals, learningProfile.level, learningProfile.weakAreas],
  );

  useEffect(() => {
    trackRoleplayEvent('roleplay_discover_viewed', { accessTier: isPremium ? 'premium' : isGuest ? 'guest' : 'free' });
  }, [isGuest, isPremium]);

  const selectScenario = (scenario: RoleplayScenario) => {
    const access = resolveRoleplayAccess({ isGuest, isPremium, scenarioPremium: scenario.premium });
    trackRoleplayEvent('roleplay_scenario_selected', {
      scenarioId: scenario.id,
      level: scenario.difficulty,
      accessTier: access.tier,
    });
    if (!access.allowed) {
      navigation.navigate('Premium');
      return;
    }
    navigation.navigate('RoleplaySession', { scenarioId: scenario.id });
  };

  return (
    <ScreenContainer contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.kicker}>{t('roleplay.title')}</Text>
      </View>
      <Text style={typography.h1}>{t('roleplay.discoverTitle')}</Text>
      <Text style={[typography.screenSubtitle, styles.subtitle]}>{t('roleplay.discoverSubtitle')}</Text>

      <Text style={styles.sectionTitle}>{t('roleplay.recommended')}</Text>
      <ScenarioCard
        scenario={recommended}
        recommended
        locked={!resolveRoleplayAccess({ isGuest, isPremium, scenarioPremium: recommended.premium }).allowed}
        onPress={() => selectScenario(recommended)}
      />

      {CATEGORY_ORDER.map((category) => {
        const scenarios = ROLEPLAY_SCENARIOS.filter((scenario) => scenario.category === category && scenario.id !== recommended.id);
        if (!scenarios.length) return null;
        return (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{t(`roleplay.categories.${category}`)}</Text>
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                locked={!resolveRoleplayAccess({ isGuest, isPremium, scenarioPremium: scenario.premium }).allowed}
                onPress={() => selectScenario(scenario)}
              />
            ))}
          </View>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPadding },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  kicker: { color: colors.secondary, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.lg },
  section: { marginTop: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  recommendedCard: { backgroundColor: colors.cardElevated, borderColor: colors.borderLight, padding: spacing.lg },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700', flex: 1 },
  cardDescription: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  startLabel: { color: colors.secondary, fontSize: 14, fontWeight: '700', marginTop: spacing.md },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.premiumMuted, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 4 },
  premiumText: { color: colors.premium, fontSize: 11, fontWeight: '700' },
});
