import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingScreenProps } from '../../navigation/types';
import { ScreenContainer, AppButton, VoiraLogo } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../theme';

type Props = OnboardingScreenProps<'OnboardingWelcome'>;

const FEATURES = [
  { icon: 'chatbubble-ellipses-outline' as const, text: 'Gerçek konuşma cümleleri' },
  { icon: 'repeat-outline' as const, text: 'Shadowing ile pratik' },
  { icon: 'analytics-outline' as const, text: 'Konuşmana göre analiz' },
];

export function OnboardingWelcomeScreen({ navigation }: Props) {
  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <AppButton
          title="Başlayalım"
          onPress={() => navigation.navigate('GoalSelection')}
        />
      }
    >
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['rgba(91,95,239,0.25)', 'rgba(139,92,246,0.08)', 'transparent']}
          style={styles.glow}
        />
        <VoiraLogo size={128} style={styles.logo} />
        <Text style={styles.brand}>Voira</Text>
        <Text style={styles.tagline}>Konuş, analiz al, geliş.</Text>
        <Text style={styles.subtitle}>
          İngilizce konuşmanı analiz eden AI konuşma koçu. Dinle, tekrar et, kaydet.
        </Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((item) => (
          <View key={item.text} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={item.icon} size={20} color={colors.secondary} />
            </View>
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: spacing.lg,
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
  features: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    ...typography.bodyEmphasis,
    flex: 1,
    fontWeight: '500',
  },
});
