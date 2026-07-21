import * as FileSystem from 'expo-file-system/legacy';

/** Minimum AAC payload for a usable ~1s mono recording on iOS. */
export const IOS_MIN_STABLE_FILE_BYTES = 3000;

/** Android uploads already work; keep a lower bar. */
export const ANDROID_MIN_STABLE_FILE_BYTES = 256;

const DEFAULT_SETTLE_MS = 200;
const DEFAULT_MAX_ATTEMPTS = 4;

export type StableFileFailureReason = 'missing' | 'too_small' | 'unstable';

export interface StableFileResult {
  ok: boolean;
  fileSizeBytes: number | null;
  stable: boolean;
  attempts: number;
  reason?: StableFileFailureReason;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

async function readFileSizeBytes(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(normalizeUri(uri));
    if (!info.exists || !('size' in info) || typeof info.size !== 'number') {
      return null;
    }
    return info.size;
  } catch {
    return null;
  }
}

/**
 * Waits for an iOS recording file to finish flushing to disk before upload/validation.
 * Compares size across short delays and accepts only when size is above minBytes and stable.
 */
export async function waitForStableFile(
  uri: string,
  options?: {
    minBytes?: number;
    settleMs?: number;
    maxAttempts?: number;
  },
): Promise<StableFileResult> {
  const minBytes = options?.minBytes ?? IOS_MIN_STABLE_FILE_BYTES;
  const settleMs = options?.settleMs ?? DEFAULT_SETTLE_MS;
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  let lastSize: number | null = null;
  let stable = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const size = await readFileSizeBytes(uri);
    if (size === null) {
      return {
        ok: false,
        fileSizeBytes: null,
        stable: false,
        attempts: attempt,
        reason: 'missing',
      };
    }

    await sleep(settleMs);

    const nextSize = await readFileSizeBytes(uri);
    if (nextSize === null) {
      return {
        ok: false,
        fileSizeBytes: null,
        stable: false,
        attempts: attempt,
        reason: 'missing',
      };
    }

    lastSize = nextSize;
    stable = nextSize >= size;

    if (stable && nextSize >= minBytes) {
      return {
        ok: true,
        fileSizeBytes: nextSize,
        stable: true,
        attempts: attempt,
      };
    }
  }

  if (lastSize === null) {
    return {
      ok: false,
      fileSizeBytes: null,
      stable: false,
      attempts: maxAttempts,
      reason: 'missing',
    };
  }

  if (lastSize < minBytes) {
    return {
      ok: false,
      fileSizeBytes: lastSize,
      stable,
      attempts: maxAttempts,
      reason: 'too_small',
    };
  }

  return {
    ok: false,
    fileSizeBytes: lastSize,
    stable: false,
    attempts: maxAttempts,
    reason: 'unstable',
  };
}
