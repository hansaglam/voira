import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Lesson } from '../types';
import { AppCard } from './AppCard';
import { getLessonTypeBadge } from '../data/lessonLibrary';
import { getActiveSegment, getLessonDifficulty } from '../utils/lessonUtils';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';
import { localizedLessonTitle } from '../utils/lessonLocalization';

interface LessonCardProps {
  lesson: Lesson;
  onPress: () => void;
}

export function LessonCard({ lesson, onPress }: LessonCardProps) {
  const { i18n } = useTranslation();
  const segment = getActiveSegment(lesson);
  const difficulty = getLessonDifficulty(lesson);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.content}>
            <Text style={typography.h3}>{localizedLessonTitle(lesson, i18n.language)}</Text>
            <Text style={[typography.body, styles.sentence]} numberOfLines={1}>
              "{segment.text}"
            </Text>
            <Text style={styles.focus}>{lesson.focusSkill}</Text>
            <View style={styles.meta}>
              <Text style={styles.typeBadge}>{getLessonTypeBadge(lesson)}</Text>
              <Text style={typography.meta}>•</Text>
              <Text style={typography.meta}>{difficulty}</Text>
              <Text style={typography.meta}>•</Text>
              <Text style={typography.meta}>{lesson.estimatedMinutes} dk</Text>
              {lesson.isPremium && (
                <>
                  <Text style={typography.meta}>•</Text>
                  <Ionicons name="diamond-outline" size={11} color={colors.premium} />
                </>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  sentence: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
    fontSize: 14,
  },
  focus: {
    ...typography.meta,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  typeBadge: {
    ...typography.meta,
    color: colors.secondary,
    fontWeight: '600',
  },
});
