import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';

interface HomeCoachInsightCardProps {
  title: string;
  body: string;
  onViewed?: () => void;
}

export function HomeCoachInsightCard({ title, body, onViewed }: HomeCoachInsightCardProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onViewed?.();
  }, [onViewed]);

  return (
    <View style={styles.card} accessibilityRole="text">
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="sparkles" size={14} color={colors.secondary} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
});
