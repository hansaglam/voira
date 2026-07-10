import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

function shadow(style: ShadowStyle): ShadowStyle {
  return Platform.select({
    ios: style,
    android: { elevation: style.elevation ?? 4 },
    default: style,
  }) as ShadowStyle;
}

export const shadows = {
  card: shadow({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  }),
  cardElevated: shadow({
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
  }),
  hero: shadow({
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  }),
  button: shadow({
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  }),
} as const;
