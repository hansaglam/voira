import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RootScreenProps } from '../navigation/types';
import { ScreenContainer, AppCard, EmptyState } from '../components';
import { goBackOrFallback } from '../navigation/safeGoBack';
import { useVocabulary } from '../hooks/useVocabulary';
import { lookupVocabularyMeaning } from '../utils/vocabularyMeanings';
import { FREE_VOCABULARY_LIMIT } from '../constants/vocabularyLimits';
import { colors, spacing, typography, borderRadius } from '../theme';

type Props = RootScreenProps<'Vocabulary'>;

function sourceLabel(item: {
  lessonTitle?: string;
  categoryTitle?: string;
}): string | null {
  if (item.lessonTitle?.trim()) return item.lessonTitle.trim();
  if (item.categoryTitle?.trim()) return item.categoryTitle.trim();
  return null;
}

export function VocabularyScreen({ navigation }: Props) {
  const { items, isLoading, removeItem, count, limit, limitReached, isPremium } =
    useVocabulary();

  const handleDelete = useCallback(
    (id: string, word: string) => {
      Alert.alert('Kelimeyi sil', `"${word}" kelime defterinden kaldırılsın mı?`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void removeItem(id);
          },
        },
      ]);
    },
    [removeItem],
  );

  const limitHint = isPremium
    ? 'Genişletilmiş Kelime Defteri'
    : `${FREE_VOCABULARY_LIMIT} kelimeye kadar ücretsiz`;

  const usageLabel = limitReached
    ? 'Limit doldu'
    : `${count} / ${limit} kelime`;

  return (
    <ScreenContainer>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          goBackOrFallback(navigation, () =>
            navigation.navigate('MainTabs', { screen: 'Home' }),
          )
        }
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.title}>Kelime Defterim</Text>
      <Text style={styles.subtitle}>
        Kaydettiğin kelime ve ifadeleri burada tekrar et.
      </Text>

      <View style={[styles.limitCard, limitReached && styles.limitCardFull]}>
        <View style={styles.limitTopRow}>
          <Text style={styles.limitHint}>{limitHint}</Text>
          {!isPremium && limitReached ? (
            <View style={styles.limitBadge}>
              <Text style={styles.limitBadgeText}>Limit doldu</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.usageLabel, limitReached && styles.usageLabelFull]}>
          {usageLabel}
        </Text>
        {!isPremium && limitReached ? (
          <TouchableOpacity
            style={styles.upgradeLink}
            onPress={() => navigation.navigate('Premium')}
            activeOpacity={0.75}
          >
            <Text style={styles.upgradeLinkText}>SpeakPlus’ı gör</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.secondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          title="Henüz kelime eklemedin"
          message="Derslerde karşına çıkan kelime ve ifadeleri ekleyerek burada tekrar edebilirsin."
          icon="bookmark-outline"
          actionLabel="Derslere git"
          onAction={() => navigation.navigate('MainTabs', { screen: 'Categories' })}
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const source = sourceLabel(item);
            const meaningTr =
              lookupVocabularyMeaning(item.word) ?? item.translationTr;
            return (
              <AppCard key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={styles.itemText}>
                    <Text style={styles.word}>{item.word}</Text>
                    <Text style={styles.translation}>{meaningTr}</Text>
                    {source ? (
                      <Text style={styles.sourceLine} numberOfLines={1}>
                        Kaynak: {source}
                      </Text>
                    ) : null}
                    {item.contextSentence ? (
                      <Text style={styles.contextLine} numberOfLines={2}>
                        {item.contextSentence}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id, item.word)}
                    hitSlop={8}
                    accessibilityLabel="Kelimeyi sil"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </AppCard>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.screenSubtitle,
    marginBottom: spacing.sm,
  },
  limitCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    gap: 4,
  },
  limitCardFull: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  limitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  limitHint: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  usageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  usageLabelFull: {
    color: '#FBBF24',
  },
  limitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  limitBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
  },
  upgradeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  upgradeLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  itemCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  word: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  translation: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sourceLine: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  contextLine: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
