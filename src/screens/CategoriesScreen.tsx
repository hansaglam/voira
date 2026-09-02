import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TabScreenProps } from '../navigation/types';
import { ScreenContainer, CategoryCard, SectionHeader } from '../components';
import { getCategoryWithCounts, getCatalogDisplayCounts } from '../data/lessons';
import { borderRadius, colors, spacing, typography } from '../theme';

type Props = TabScreenProps<'Categories'>;

export function CategoriesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const categories = getCategoryWithCounts();
  const { categoryCount, totalLessons } = getCatalogDisplayCounts();

  return (
    <ScreenContainer withTabBar>
      <View style={styles.header}>
        <Text style={typography.h1}>{t('categories.title')}</Text>
        <Text style={typography.screenSubtitle}>{t('categories.subtitle')}</Text>
      </View>

      <SectionHeader
        title={t('categories.sectionTitle')}
        subtitle={t('categories.sectionSubtitle', { categoryCount, totalLessons })}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('roleplay.discoverTitle')}
        onPress={() => navigation.navigate('RoleplayDiscover')}
        style={({ pressed }) => [styles.roleplayCard, pressed && styles.pressed]}
      >
        <Text style={styles.roleplayTitle}>{t('roleplay.discoverTitle')}</Text>
        <Text style={styles.roleplaySubtitle}>{t('roleplay.discoverSubtitle')}</Text>
        <Text style={styles.roleplayCta}>{t('roleplay.start')} →</Text>
      </Pressable>

      {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onPress={() => navigation.navigate('CategoryLessons', { categoryId: category.id })}
          />
        ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  roleplayCard: { backgroundColor: colors.cardElevated, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.lg, marginBottom: spacing.lg },
  roleplayTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  roleplaySubtitle: { color: colors.textSecondary, lineHeight: 20, marginTop: spacing.xs },
  roleplayCta: { color: colors.secondary, fontWeight: '700', marginTop: spacing.md },
  pressed: { opacity: 0.82 },
});
