import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSpeakingTestLayout } from './useSpeakingTestLayout';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface SpeakingTestHeaderProps {
  title: string;
  subtitle: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
}

export function SpeakingTestHeader({
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
}: SpeakingTestHeaderProps) {
  const layout = useSpeakingTestLayout();
  const progress = step / totalSteps;
  const backSize = layout.header.backSize;

  return (
    <View style={[styles.container, { marginBottom: layout.header.marginBottom }]}>
      <View
        style={[
          styles.topRow,
          {
            gap: layout.header.topRowGap,
            marginBottom: layout.header.topRowMarginBottom,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            { width: backSize, height: backSize, borderRadius: backSize / 2 },
          ]}
          onPress={onBack}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.progressWrap}>
          <View style={styles.track}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.stepLabel}>
            {step} / {totalSteps}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.title,
          {
            fontSize: layout.header.titleSize,
            lineHeight: layout.header.titleLineHeight,
            marginBottom: layout.compact ? spacing.xs : spacing.sm,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          {
            fontSize: layout.header.subtitleSize,
            lineHeight: layout.header.subtitleLineHeight,
          },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(26, 27, 46, 0.9)',
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(46, 47, 69, 0.8)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
    minWidth: 32,
    textAlign: 'right',
  },
  title: {
    ...typography.h1,
    letterSpacing: -0.4,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
