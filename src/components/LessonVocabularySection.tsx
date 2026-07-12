import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Lesson } from '../types/lesson';
import type { LessonSegment } from '../types/segment';
import { useVocabulary } from '../hooks/useVocabulary';
import { getVocabularyCandidates } from '../utils/vocabularyCandidates';
import { colors, spacing, borderRadius } from '../theme';

type Props = {
  lesson: Lesson;
  segment: LessonSegment;
};

export function LessonVocabularySection({ lesson, segment }: Props) {
  const { isSaved, addItem } = useVocabulary();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const candidates = useMemo(() => getVocabularyCandidates(segment), [segment]);

  if (candidates.length === 0) return null;

  const handleAdd = async (word: string, translationTr: string) => {
    const key = `${word}::${translationTr}`;
    if (isSaved(word, translationTr) || pendingKey === key) return;

    setPendingKey(key);
    try {
      await addItem({
        word,
        translationTr,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        segmentId: segment.id,
        categoryId: lesson.category,
      });
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="bookmark-outline" size={14} color={colors.secondary} />
        </View>
        <Text style={styles.title}>Bu bölümden kelimeler</Text>
      </View>

      {candidates.map((entry) => {
        const saved = isSaved(entry.word, entry.translationTr);
        const key = `${entry.word}::${entry.translationTr}`;
        const loading = pendingKey === key;

        return (
          <View key={key} style={styles.row}>
            <View style={styles.textWrap}>
              <Text style={styles.word} numberOfLines={2}>
                {entry.word}
              </Text>
              <Text style={styles.translation} numberOfLines={2}>
                {entry.translationTr}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.button, saved && styles.buttonSaved]}
              onPress={() => void handleAdd(entry.word, entry.translationTr)}
              disabled={saved || loading}
              activeOpacity={0.75}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.buttonText, saved && styles.buttonTextSaved]}>
                  {saved ? 'Eklendi' : 'Ekle'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  word: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  translation: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  button: {
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(91, 95, 239, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSaved: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.28)',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  buttonTextSaved: {
    color: colors.success,
  },
});
