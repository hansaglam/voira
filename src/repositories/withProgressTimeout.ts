import { withTimeout } from '../utils/fetchWithTimeout';
import { PROGRESS_SYNC_TIMEOUT_MS } from '../config/httpTimeouts';

/** Supabase builders are thenable but not typed as Promise — normalize for timeouts. */
export function withProgressTimeout<T>(thenable: PromiseLike<T>): Promise<T> {
  return withTimeout(Promise.resolve(thenable), PROGRESS_SYNC_TIMEOUT_MS, 'progress_sync_timeout');
}
