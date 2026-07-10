import {
  CommonActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function safeNavigate(name: keyof RootStackParamList, params?: object): void {
  if (!navigationRef.isReady()) {
    if (__DEV__) {
      console.warn('[Navigation] Tried to navigate before ready', name);
    }
    return;
  }

  const navigate = navigationRef.navigate as (
    screen: keyof RootStackParamList,
    params?: object,
  ) => void;
  navigate(name, params);
}

export function safeReset(state: Parameters<typeof CommonActions.reset>[0]): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.reset(state));
    return;
  }

  if (__DEV__) {
    console.warn('[Navigation] Tried to reset before ready');
  }
}
