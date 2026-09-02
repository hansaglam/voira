import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../components';
import type { RootScreenProps } from '../navigation/types';
import { getRoleplayScenarioById } from '../services/roleplay';
import { trackRoleplayEvent } from '../services/analytics/roleplayAnalytics';
import { borderRadius, colors, layout, spacing, typography } from '../theme';

type Props = RootScreenProps<'RoleplayResult'>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function RoleplayResultScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { result } = route.params;
  const coaching = result.coaching;
  const scenario = getRoleplayScenarioById(result.scenarioId);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    const metadata = {
      scenarioId: result.scenarioId,
      outcome: coaching.outcome,
      primaryTakeawayType: coaching.primaryTakeaway.type,
      nextFocusId: coaching.nextFocus,
      phraseSuggestionCount: coaching.phraseSuggestions.length,
    };
    trackRoleplayEvent('roleplay_result_viewed', metadata);
    trackRoleplayEvent(
      coaching.usedFallback ? 'roleplay_coaching_failed' : 'roleplay_coaching_generated',
      metadata,
    );
    if (coaching.phraseSuggestions.length > 0) {
      trackRoleplayEvent('roleplay_phrase_suggestion_viewed', metadata);
    }
  }, [coaching, result.scenarioId]);

  const goHome = () => {
    trackRoleplayEvent('roleplay_result_continue_tapped', {
      scenarioId: result.scenarioId,
      outcome: coaching.outcome,
      nextFocusId: coaching.nextFocus,
    });
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <ScreenContainer contentStyle={styles.content}>
      <View style={styles.completionIcon}>
        <Ionicons name="checkmark" size={34} color={colors.success} />
      </View>
      <Text style={[typography.h1, styles.center]}>{t('roleplay.result.complete')}</Text>
      <Text style={styles.scenarioTitle}>{scenario ? t(scenario.titleKey) : t('roleplay.title')}</Text>
      <Text style={styles.outcome}>{t(`roleplay.result.${coaching.outcome}`)}</Text>

      <Section title={t('roleplay.result.primaryTakeaway')}>
        <View style={styles.highlightCard}>
          <Text style={styles.body}>{coaching.primaryTakeaway.message}</Text>
        </View>
      </Section>

      {coaching.strengths.length > 0 ? (
        <Section title={t('roleplay.result.strengths')}>
          {coaching.strengths.map((item, index) => (
            <View key={`${item.type}-${index}`} style={styles.listRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={styles.listText}>{item.message}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      {coaching.phraseSuggestions.length > 0 ? (
        <Section title={t('roleplay.result.naturalEnglish')}>
          {coaching.phraseSuggestions.map((item, index) => (
            <View key={`${index}-${item.original}`} style={styles.phraseCard}>
              <Text style={styles.label}>{t('roleplay.result.youSaid')}</Text>
              <Text style={styles.sourcePhrase}>“{item.original}”</Text>
              <Text style={styles.label}>{t('roleplay.result.tryThis')}</Text>
              <Text style={styles.suggestion}>“{item.suggestion}”</Text>
              <Text style={styles.label}>{t('roleplay.result.why')}</Text>
              <Text style={styles.reason}>{item.reason}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      {coaching.improvements.length > 0 ? (
        <Section title={t('roleplay.result.improvements')}>
          {coaching.improvements.map((item, index) => (
            <View key={`${item.type}-${index}`} style={styles.listRow}>
              <Ionicons name="arrow-forward-circle-outline" size={20} color={colors.secondary} />
              <Text style={styles.listText}>{item.message}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      {coaching.usedFallback ? <Text style={styles.fallback}>{t('roleplay.result.fallback')}</Text> : null}

      <Section title={t('roleplay.result.nextFocus')}>
        <View style={styles.nextFocusCard}>
          <Ionicons name="compass-outline" size={22} color={colors.secondary} />
          <Text style={styles.nextFocusText}>{t(`roleplay.result.focus.${coaching.nextFocus}`)}</Text>
        </View>
      </Section>

      <Pressable accessibilityRole="button" onPress={goHome} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{t('roleplay.result.continue')}</Text>
      </Pressable>
      <View style={styles.secondaryActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            trackRoleplayEvent('roleplay_result_retry_tapped', { scenarioId: result.scenarioId, outcome: coaching.outcome });
            navigation.replace('RoleplaySession', { scenarioId: result.scenarioId });
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>{t('roleplay.result.tryAgain')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => navigation.replace('RoleplayDiscover')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{t('roleplay.result.anotherScenario')}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg },
  completionIcon: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(52,211,153,0.12)', marginBottom: spacing.md },
  center: { textAlign: 'center' },
  scenarioTitle: { color: colors.secondary, textAlign: 'center', fontWeight: '700', marginTop: spacing.sm },
  outcome: { color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm },
  highlightCard: { backgroundColor: colors.cardElevated, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, padding: spacing.lg },
  body: { color: colors.textPrimary, fontSize: 16, lineHeight: 23 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  listText: { color: colors.textSecondary, lineHeight: 21, flex: 1 },
  phraseCard: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.xs },
  sourcePhrase: { color: colors.textSecondary, fontSize: 15, lineHeight: 21, marginVertical: spacing.xs },
  suggestion: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', lineHeight: 22, marginVertical: spacing.xs },
  reason: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  fallback: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.lg },
  nextFocusCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, padding: spacing.md, borderRadius: borderRadius.lg },
  nextFocusText: { color: colors.textPrimary, fontWeight: '700', flex: 1 },
  primaryButton: { height: 52, borderRadius: borderRadius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryActions: { gap: spacing.sm, marginTop: spacing.sm },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.secondary, fontWeight: '700', textAlign: 'center' },
});
