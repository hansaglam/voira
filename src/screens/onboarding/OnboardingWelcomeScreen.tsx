import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { OnboardingScreenProps } from '../../navigation/types';
import { ScreenContainer, AppButton, VoiraLogo } from '../../components';
import { colors, spacing, typography } from '../../theme';

type Props = OnboardingScreenProps<'OnboardingWelcome'>;

export function OnboardingWelcomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <AppButton
          title={t('onboarding.welcomeCta')}
          onPress={() => navigation.navigate('GoalSelection')}
        />
      }
    >
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['rgba(91,95,239,0.25)', 'rgba(139,92,246,0.08)', 'transparent']}
          style={styles.glow}
        />
        <VoiraLogo size={120} style={styles.logo} />
        <Text style={styles.brand}>Voira</Text>
        <Text style={styles.tagline}>{t('onboarding.welcomeTagline')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.welcomeSubtitle')}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: spacing.xl,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -36,
  },
  logo: {
    marginBottom: spacing.lg,
  },
  brand: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.8,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    lineHeight: 28,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 24,
    color: colors.textSecondary,
  },
});
