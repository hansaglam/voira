import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

type AccordionIcon = 'chatbubble' | 'bulb' | 'alert' | 'repeat';

interface AccordionCardProps {
  title: string;
  content: string;
  icon: AccordionIcon;
  expanded: boolean;
  onToggle: () => void;
  accentColor?: string;
  collapsedHint?: string;
}

const ICON_MAP: Record<AccordionIcon, keyof typeof Ionicons.glyphMap> = {
  chatbubble: 'chatbubble-ellipses-outline',
  bulb: 'bulb-outline',
  alert: 'alert-circle-outline',
  repeat: 'repeat-outline',
};

const COLOR_MAP: Record<AccordionIcon, string> = {
  chatbubble: colors.primary,
  bulb: colors.warning,
  alert: colors.error,
  repeat: colors.secondary,
};

export function AccordionCard({
  title,
  content,
  icon,
  expanded,
  onToggle,
  accentColor,
  collapsedHint = 'Kısa açıklamayı aç',
}: AccordionCardProps) {
  const color = accentColor ?? COLOR_MAP[icon];
  const rotate = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotate]);

  const chevronRotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${color}14` }]}>
          <Ionicons name={ICON_MAP[icon]} size={14} color={color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {!expanded && <Text style={styles.hint}>{collapsedHint}</Text>}
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Animated.View>
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          <View style={styles.contentDivider} />
          <Text style={styles.content}>{content}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: 'rgba(91, 95, 239, 0.22)',
    backgroundColor: 'rgba(26, 27, 46, 0.92)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  headerPressed: {
    opacity: 0.88,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  body: {
    paddingTop: 0,
  },
  contentDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  content: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 0,
  },
});
