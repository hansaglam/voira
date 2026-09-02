import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, spacing } from '../../theme';

export function RoleplayRecommendationCard({
  eyebrow,
  title,
  description,
  meta,
  cta,
  locked,
  onPress,
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  cta: string;
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${eyebrow}. ${title}. ${cta}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Ionicons name={locked ? 'lock-closed' : 'mic-outline'} size={18} color={locked ? colors.premium : colors.secondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.meta}>{meta}</Text>
      <Text style={styles.cta}>{cta} →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cardElevated, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.lg, marginTop: spacing.lg },
  pressed: { opacity: 0.82 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.secondary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: spacing.sm },
  description: { color: colors.textSecondary, lineHeight: 20, marginTop: spacing.xs },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  cta: { color: colors.secondary, fontWeight: '700', marginTop: spacing.md },
});
