import * as FileSystem from 'expo-file-system/legacy';
import { GUEST_USER_ID_PREFIX } from './authConfig';

const ANONYMOUS_ID_FILE = `${FileSystem.documentDirectory}echospeak-anonymous-id.txt`;

function createAnonymousId(): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${GUEST_USER_ID_PREFIX}${randomPart}`;
}

export async function getOrCreateAnonymousUserId(): Promise<string> {
  try {
    const info = await FileSystem.getInfoAsync(ANONYMOUS_ID_FILE);
    if (info.exists) {
      const stored = (await FileSystem.readAsStringAsync(ANONYMOUS_ID_FILE)).trim();
      if (stored.startsWith(GUEST_USER_ID_PREFIX)) {
        return stored;
      }
    }
  } catch {
    // fall through to create a new id
  }

  const nextId = createAnonymousId();
  try {
    await FileSystem.writeAsStringAsync(ANONYMOUS_ID_FILE, nextId);
  } catch {
    // still return in-memory id for this session
  }
  return nextId;
}
