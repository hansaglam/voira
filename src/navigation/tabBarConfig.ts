import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList } from './types';

export type TabConfigItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

export const TAB_CONFIG: Record<keyof MainTabParamList, TabConfigItem> = {
  Home: { label: 'Ana Sayfa', icon: 'home-outline', iconFocused: 'home' },
  Categories: { label: 'Kategoriler', icon: 'grid-outline', iconFocused: 'grid' },
  Progress: { label: 'Gelişim', icon: 'trending-up-outline', iconFocused: 'trending-up' },
  Profile: { label: 'Profil', icon: 'person-outline', iconFocused: 'person' },
};
