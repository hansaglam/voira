import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TabScreenProps } from '../navigation/types';
import { ScreenContainer, CategoryCard, SectionHeader } from '../components';
import { getCategoryWithCounts } from '../data/lessons';
import { spacing, typography } from '../theme';

type Props = TabScreenProps<'Categories'>;

export function CategoriesScreen({ navigation }: Props) {
  const categories = getCategoryWithCounts();

  return (
    <ScreenContainer withTabBar>
      <View style={styles.header}>
        <Text style={typography.h1}>Öğrenme yolları</Text>
        <Text style={typography.screenSubtitle}>
          Hedefine uygun shadowing paketlerini keşfet.
        </Text>
      </View>

      <SectionHeader
        title="Tüm kategoriler"
        subtitle={`${categories.length} paket • ${categories.reduce((sum, c) => sum + c.lessonCount, 0)} ders`}
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
