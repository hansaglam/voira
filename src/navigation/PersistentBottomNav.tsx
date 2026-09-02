import React, { useCallback } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TAB_CONFIG } from './tabBarConfig';
import type { MainTabParamList } from './types';
import { colors, spacing, layout } from '../theme';

interface PersistentBottomNavProps {
  activeTab?: keyof MainTabParamList;
}

export function getPersistentTabBarHeight(insetBottom: number): number {
  const bottomPad = Math.max(insetBottom, layout.tabBarBottomInset);
  return layout.tabBarHeight + bottomPad + spacing.sm;
}

export function PersistentBottomNav({ activeTab }: PersistentBottomNavProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, layout.tabBarBottomInset);

  const navigateToTab = useCallback(
    (tabName: keyof MainTabParamList) => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'MainTabs',
              params: { screen: tabName },
            },
          ],
        }),
      );
    },
    [navigation],
  );

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <View style={styles.inner}>
        {(Object.keys(TAB_CONFIG) as Array<keyof MainTabParamList>).map((tabName) => {
          const config = TAB_CONFIG[tabName];
          const isFocused = activeTab === tabName;

          return (
            <TouchableOpacity
              key={tabName}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => navigateToTab(tabName)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              {isFocused ? <View style={styles.activeIndicator} /> : null}
              <Ionicons
                name={isFocused ? config.iconFocused : config.icon}
                size={21}
                color={isFocused ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.label, isFocused && styles.labelFocused]}>
                {t(`tabs.${config.labelKey}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    paddingTop: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },
  inner: {
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -spacing.sm,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 3,
  },
  labelFocused: {
    color: colors.primary,
    fontWeight: '600',
  },
});
