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
import { colors, spacing, typography, borderRadius } from '../theme';

type Props = RootScreenProps<'Vocabulary'>;

export function VocabularyScreen({ navigation }: Props) {
  const { items, isLoading, removeItem, count } = useVocabulary();

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

  return (
    <ScreenContainer>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          goBackOrFallback(navigation, () =>
            navigation.navigate('MainTabs', { screen: 'Profile' }),
          )
        }
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.title}>Kelime Defterim</Text>
      <Text style={styles.subtitle}>
        Derslerde öğrendiğin kelime ve ifadeleri burada sakla.
      </Text>
      {count > 0 ? (
        <Text style={styles.countLabel}>{count} kelime</Text>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          title="Henüz kelime eklemedin"
          message="Derslerdeki önemli ifadeleri kelime defterine ekleyerek tekrar edebilirsin."
          icon="bookmark-outline"
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <AppCard key={item.id} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemText}>
                  <Text style={styles.word}>{item.word}</Text>
                  <Text style={styles.translation}>{item.translationTr}</Text>
                  {item.lessonTitle ? (
                    <Text style={styles.lessonTitle} numberOfLines={1}>
                      {item.lessonTitle}
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
          ))}
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
    marginBottom: spacing.xs,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.md,
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
  lessonTitle: {
    fontSize: 12,
    color: colors.textMuted,
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
