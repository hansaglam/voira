import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TabScreenProps } from '../navigation/types';
import { ScreenContainer, CategoryCard, SectionHeader } from '../components';
import { getCategoryWithCounts, getCatalogDisplayCounts } from '../data/lessons';
import { spacing, typography } from '../theme';

type Props = TabScreenProps<'Categories'>;

export function CategoriesScreen({ navigation }: Props) {
  const categories = getCategoryWithCounts();
  const { categoryCount, totalLessons } = getCatalogDisplayCounts();

  return (
    <ScreenContainer withTabBar>
      <View style={styles.header}>
        <Text style={typography.h1}>Öğrenme yolları</Text>
        <Text style={typography.screenSubtitle}>
          Hedefine uygun konuşma pratiği yollarını keşfet.
        </Text>
      </View>

      <SectionHeader
        title="Tüm kategoriler"
        subtitle={`${categoryCount} öğrenme yolu • ${totalLessons} ders`}
      />

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
});
