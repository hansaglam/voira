import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList } from './types';

export type TabConfigItem = {
  /** i18n key under `tabs.*` */
  labelKey: 'home' | 'categories' | 'progress' | 'profile';
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

export const TAB_CONFIG: Record<keyof MainTabParamList, TabConfigItem> = {
  Home: { labelKey: 'home', icon: 'home-outline', iconFocused: 'home' },
  Categories: { labelKey: 'categories', icon: 'grid-outline', iconFocused: 'grid' },
  Progress: { labelKey: 'progress', icon: 'trending-up-outline', iconFocused: 'trending-up' },
  Profile: { labelKey: 'profile', icon: 'person-outline', iconFocused: 'person' },
};
