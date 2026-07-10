import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from './AppCard';
import { colors, spacing, typography, borderRadius } from '../theme';

type TeachingIcon = 'chatbubble' | 'bulb' | 'alert' | 'repeat';

interface LessonTeachingCardProps {
  title: string;
  content: string;
  icon: TeachingIcon;
  accentColor?: string;
}

const ICON_MAP: Record<TeachingIcon, keyof typeof Ionicons.glyphMap> = {
  chatbubble: 'chatbubble-ellipses-outline',
  bulb: 'bulb-outline',
  alert: 'alert-circle-outline',
  repeat: 'repeat-outline',
};

const COLOR_MAP: Record<TeachingIcon, string> = {
  chatbubble: colors.primary,
  bulb: colors.warning,
  alert: colors.error,
  repeat: colors.secondary,
};

export function LessonTeachingCard({
  title,
  content,
  icon,
  accentColor,
}: LessonTeachingCardProps) {
  const color = accentColor ?? COLOR_MAP[icon];

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={ICON_MAP[icon]} size={16} color={color} />
        </View>
        <Text style={[styles.title, { color }]}>{title}</Text>
      </View>
      <Text style={styles.content}>{content}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.label,
    textTransform: 'none',
    letterSpacing: 0.3,
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    ...typography.body,
    lineHeight: 24,
  },
});
