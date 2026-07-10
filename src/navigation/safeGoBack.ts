import type { NavigationProp, ParamListBase } from '@react-navigation/native';

export function goBackOrFallback(
  navigation: NavigationProp<ParamListBase>,
  fallback: () => void,
): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  fallback();
}
