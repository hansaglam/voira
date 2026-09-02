import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppButton } from './AppButton';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../theme';
import { useTranslation } from 'react-i18next';

interface LessonActionBarProps {
  onRetry: () => void;
  onAnalyze: () => void;
  analyzeDisabled: boolean;
  showRetry?: boolean;
}

export function LessonActionBar({
  onRetry,
  onAnalyze,
  analyzeDisabled,
  showRetry = true,
}: LessonActionBarProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['transparent', 'rgba(15, 16, 32, 0.4)', 'rgba(15, 16, 32, 0.94)']}
        style={styles.scrim}
      />
      <View style={styles.bar}>
        {showRetry ? (
          <AppButton
            title={t('lesson.retry')}
            variant="outline"
            size="compact"
            onPress={onRetry}
            style={styles.secondary}
          />
        ) : null}
        <AppButton
          title={t('lesson.analyze')}
          size="compact"
          onPress={onAnalyze}
          disabled={analyzeDisabled}
          elevated={!analyzeDisabled}
          style={showRetry ? styles.primary : styles.primaryFull}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  scrim: {
    position: 'absolute',
    top: -14,
    left: -spacing.md,
    right: -spacing.md,
    height: 14,
    pointerEvents: 'none',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondary: {
    flex: 1,
  },
  primary: {
    flex: 1.1,
  },
  primaryFull: {
    flex: 1,
  },
});
