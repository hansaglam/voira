import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeWeakWordPreviewItem } from '../../services/home';
import { colors, spacing, borderRadius } from '../../theme';

interface WeakWordsPreviewProps {
  title: string;
  items: HomeWeakWordPreviewItem[];
  ctaLabel: string;
  onPressSection: () => void;
  onPressCta: () => void;
}

export function WeakWordsPreview({
  title,
  items,
  ctaLabel,
  onPressSection,
  onPressCta,
}: WeakWordsPreviewProps) {
  if (items.length === 0) return null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPressSection} activeOpacity={0.92}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item) => (
        <View
          key={item.word}
          style={styles.row}
          accessible
          accessibilityLabel={`${item.word}, ${item.score}`}
        >
          <Text style={styles.word}>{item.word}</Text>
          <Text style={styles.score}>{item.score}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={styles.cta}
        onPress={onPressCta}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.secondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  word: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  score: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
  },
  cta: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
});
