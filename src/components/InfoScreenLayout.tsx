import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { ScreenContainer } from './ScreenContainer';
import { goBackOrFallback } from '../navigation/safeGoBack';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography, borderRadius } from '../theme';

interface InfoSection {
  title?: string;
  body: string;
}

interface InfoScreenLayoutProps {
  title: string;
  subtitle?: string;
  sections: InfoSection[];
  footer?: React.ReactNode;
  header?: React.ReactNode;
  contentStyle?: ViewStyle;
}

export function InfoScreenLayout({
  title,
  subtitle,
  sections,
  footer,
  header,
  contentStyle,
}: InfoScreenLayoutProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <ScreenContainer scrollable={false} contentStyle={contentStyle}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          goBackOrFallback(navigation, () =>
            navigation.navigate('MainTabs', { screen: 'Profile' }),
          )
        }
      >
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {header ? <View style={styles.header}>{header}</View> : null}

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, index) => (
          <View key={`${section.title ?? 'section'}-${index}`} style={styles.section}>
            {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
        {footer}
      </ScrollView>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
});
