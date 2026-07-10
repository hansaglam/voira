import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text } from 'react-native';
import { colors, spacing, layout } from '../theme';

const TAB_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }
> = {
  Home: { label: 'Ana Sayfa', icon: 'home-outline', iconFocused: 'home' },
  Categories: { label: 'Kategoriler', icon: 'grid-outline', iconFocused: 'grid' },
  Progress: { label: 'Gelişim', icon: 'trending-up-outline', iconFocused: 'trending-up' },
  Profile: { label: 'Profil', icon: 'person-outline', iconFocused: 'person' },
};

export function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, layout.tabBarBottomInset);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              {isFocused && <View style={styles.activeIndicator} />}
              <Ionicons
                name={isFocused ? config.iconFocused : config.icon}
                size={21}
                color={isFocused ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.label, isFocused && styles.labelFocused]}>
                {config.label}
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
