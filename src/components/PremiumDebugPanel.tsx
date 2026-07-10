import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { usePremium } from '../context/PremiumContext';
import { colors, spacing, typography } from '../theme';

export function PremiumDebugPanel() {
  if (!__DEV__) return null;

  const { debugPremiumStatus } = usePremium();
  if (!debugPremiumStatus) return null;

  const entitlementsLabel =
    debugPremiumStatus.activeEntitlements.length > 0
      ? debugPremiumStatus.activeEntitlements.join(', ')
      : 'none';

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Premium debug</Text>
      <Text style={styles.line}>RC user: {debugPremiumStatus.revenueCatAppUserIdShort}</Text>
      <Text style={styles.line}>Entitlements: {entitlementsLabel}</Text>
      <Text style={styles.line}>
        speakplus: {debugPremiumStatus.hasSpeakPlus ? 'active' : 'inactive'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  title: {
    ...typography.meta,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  line: {
    ...typography.meta,
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
