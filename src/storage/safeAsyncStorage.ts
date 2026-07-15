import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * In-memory fallback when the AsyncStorage native module is unavailable
 * (e.g. Expo Go / bridge not ready / version mismatch during reload).
 */
const memoryStore = new Map<string, string>();

function isNativeModuleError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String(error);
  return (
    message.includes('Native module is null') ||
    message.includes('AsyncStorageError') ||
    message.includes('cannot access legacy storage') ||
    message.includes('NativeModule: AsyncStorage is null')
  );
}

async function withFallback<T>(
  action: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (__DEV__ && isNativeModuleError(error)) {
      console.warn(
        '[Voira Storage] AsyncStorage native module unavailable; using memory fallback.',
      );
    }
    return fallback();
  }
}

/**
 * Supabase-compatible + app-safe AsyncStorage facade.
 * Never throws for get/set/remove so auth auto-refresh and boot loads stay quiet.
 */
export const safeAsyncStorage = {
  getItem(key: string): Promise<string | null> {
    return withFallback(
      () => AsyncStorage.getItem(key),
      () => memoryStore.get(key) ?? null,
    );
  },

  setItem(key: string, value: string): Promise<void> {
    return withFallback(
      async () => {
        await AsyncStorage.setItem(key, value);
        memoryStore.set(key, value);
      },
      () => {
        memoryStore.set(key, value);
      },
    );
  },

  removeItem(key: string): Promise<void> {
    return withFallback(
      async () => {
        await AsyncStorage.removeItem(key);
        memoryStore.delete(key);
      },
      () => {
        memoryStore.delete(key);
      },
    );
  },

  multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]> {
    return withFallback(
      () => AsyncStorage.multiGet([...keys]),
      () => keys.map((key) => [key, memoryStore.get(key) ?? null] as [string, string | null]),
    );
  },

  multiSet(keyValuePairs: readonly [string, string][]): Promise<void> {
    return withFallback(
      async () => {
        await AsyncStorage.multiSet([...keyValuePairs]);
        for (const [key, value] of keyValuePairs) {
          memoryStore.set(key, value);
        }
      },
      () => {
        for (const [key, value] of keyValuePairs) {
          memoryStore.set(key, value);
        }
      },
    );
  },

  multiRemove(keys: readonly string[]): Promise<void> {
    return withFallback(
      async () => {
        await AsyncStorage.multiRemove([...keys]);
        for (const key of keys) {
          memoryStore.delete(key);
        }
      },
      () => {
        for (const key of keys) {
          memoryStore.delete(key);
        }
      },
    );
  },

  clear(): Promise<void> {
    return withFallback(
      async () => {
        await AsyncStorage.clear();
        memoryStore.clear();
      },
      () => {
        memoryStore.clear();
      },
    );
  },

  getAllKeys(): Promise<readonly string[]> {
    return withFallback(
      () => AsyncStorage.getAllKeys(),
      () => Array.from(memoryStore.keys()),
    );
  },
};

export default safeAsyncStorage;
