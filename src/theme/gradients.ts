import { colors } from './colors';

export const gradients = {
  primary: [colors.gradientStart, colors.gradientEnd] as const,
  hero: ['#4F46E5', '#6366F1', '#8B5CF6'] as const,
  cardTint: ['rgba(91, 95, 239, 0.12)', 'rgba(26, 27, 46, 0.96)'] as const,
  premiumTint: ['rgba(229, 184, 74, 0.14)', 'rgba(26, 27, 46, 0.95)'] as const,
  screenFade: ['rgba(15, 16, 32, 0)', 'rgba(15, 16, 32, 0.94)'] as const,
} as const;
