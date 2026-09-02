import { isGuestUserId } from '../auth/authConfig';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Guest / pre-auth local ids never write to Supabase progress tables. */
export function shouldSyncProgressForUserId(userId: string | undefined): boolean {
  if (!userId?.trim()) return false;
  if (isGuestUserId(userId)) return false;
  if (userId === 'local-user') return false;
  return UUID_RE.test(userId.trim());
}
