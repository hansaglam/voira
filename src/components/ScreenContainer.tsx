import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Extra bottom padding for tab screens so content clears the tab bar */
  withTabBar?: boolean;
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
  footer,
  footerClearance,
  footerCompact = false,
  footerBorderless = false,
  footerStyle,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = getTabBarScrollPadding(insets.bottom);
  const bottomPadding = withTabBar
    ? tabBarPadding
    : insets.bottom + spacing.lg + spacing.md;
  const footerTopPad = footerBorderless
    ? spacing.sm
    : footerCompact
      ? spacing.xs
      : spacing.sm;
  const footerBottomPad = insets.bottom + spacing.sm;
  const footerBarHeight = footerTopPad + 46 + footerBottomPad;
  const defaultFooterClearance = footerBarHeight + spacing.md;
  const scrollFooterPadding = footerClearance ?? defaultFooterClearance;

  if (footer) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={['top']}>
        <View style={styles.flex}>
          <ScrollView
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
        </View>
      </SafeAreaView>
    );
  }

  if (scrollable) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, styles.flex, { paddingBottom: bottomPadding }, style]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.flex, contentStyle]}>{children}</View>
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
