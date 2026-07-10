import { useWindowDimensions } from 'react-native';
import { spacing } from '../theme';

const COMPACT_HEIGHT = 740;

export function useLessonLayout() {
  const { height } = useWindowDimensions();
  const compact = height < COMPACT_HEIGHT;

  return {
    compact,
    headerGap: compact ? spacing.xs : spacing.sm,
    sectionGap: compact ? spacing.xs : spacing.sm,
  };
}
