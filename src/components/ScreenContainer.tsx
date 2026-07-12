import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getPersistentTabBarHeight,
  PersistentBottomNav,
} from '../navigation/PersistentBottomNav';
import type { MainTabParamList } from '../navigation/types';
import { colors, spacing, layout } from '../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Extra bottom padding for tab screens so content clears the tab bar */
  withTabBar?: boolean;
  /** Compact bottom nav for stack screens pushed above MainTabs (Lesson, Analysis, etc.) */
  withPersistentTabBar?: boolean;
  /** Highlight active tab in persistent bottom nav */
  activeTab?: keyof MainTabParamList;
  /** Optional sticky footer (CTA area) pinned above safe area */
  footer?: React.ReactNode;
  /** Override scroll bottom padding when using a fixed footer */
  footerClearance?: number;
  /** Lighter, slimmer fixed footer bar */
  footerCompact?: boolean;
  /** Hide top border on fixed footer */
  footerBorderless?: boolean;
  /** Optional style override for the fixed footer container */
  footerStyle?: ViewStyle;
  /** Optional ref for the inner ScrollView (tab screens, focus scroll) */
  scrollRef?: React.RefObject<ScrollView | null>;
}

function getTabBarScrollPadding(insetBottom: number): number {
  const safeBottom = Math.max(insetBottom, layout.tabBarBottomInset);
  return layout.tabBarHeight + safeBottom + spacing.tabContentBottom;
}

export function ScreenContainer({
  children,
  scrollable = true,
  style,
  contentStyle,
  withTabBar = false,
  withPersistentTabBar = false,
  activeTab,
  footer,
  footerClearance,
  footerCompact = false,
  footerBorderless = false,
  footerStyle,
  scrollRef,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = getTabBarScrollPadding(insets.bottom);
  const persistentTabBarHeight = getPersistentTabBarHeight(insets.bottom);
  const bottomPadding = withTabBar
    ? tabBarPadding
    : withPersistentTabBar
      ? persistentTabBarHeight + spacing.md
      : insets.bottom + spacing.lg + spacing.md;
  const footerTopPad = footerBorderless
    ? spacing.sm
    : footerCompact
      ? spacing.xs
      : spacing.sm;
  const footerBottomPad = withPersistentTabBar
    ? spacing.sm
    : insets.bottom + spacing.sm;
  const footerBarHeight = footerTopPad + 46 + footerBottomPad;
  const defaultFooterClearance =
    footerBarHeight + (withPersistentTabBar ? persistentTabBarHeight : 0) + spacing.md;
  const scrollFooterPadding =
    footerClearance != null
      ? footerClearance + (withPersistentTabBar ? persistentTabBarHeight : 0) + spacing.md
      : defaultFooterClearance;

  if (footer) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={['top']}>
        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: scrollFooterPadding },
              contentStyle,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces
          >
            {children}
          </ScrollView>
          <View
            style={[
              styles.footer,
              footerCompact && styles.footerCompact,
              footerBorderless && styles.footerBorderless,
              { paddingBottom: footerBottomPad },
              footerStyle,
            ]}
          >
            {footer}
          </View>
          {withPersistentTabBar ? <PersistentBottomNav activeTab={activeTab} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  if (scrollable) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={['top']}>
        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomPadding },
              contentStyle,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {withPersistentTabBar ? <PersistentBottomNav activeTab={activeTab} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top']}>
      <View style={[styles.flex, contentStyle]}>
        <View style={[styles.flex, { paddingBottom: bottomPadding }]}>{children}</View>
        {withPersistentTabBar ? <PersistentBottomNav activeTab={activeTab} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerCompact: {
    paddingTop: spacing.xs,
    borderTopColor: 'rgba(46, 47, 69, 0.65)',
  },
  footerBorderless: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(139, 92, 246, 0.14)',
    paddingTop: spacing.sm + 2,
    backgroundColor: 'rgba(15, 16, 32, 0.97)',
  },
});
