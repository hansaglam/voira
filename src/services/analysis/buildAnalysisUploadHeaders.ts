import { getCurrentSession } from '../auth/authService';
import { getOrCreateAnonymousUserId } from '../auth/anonymousIdStorage';
import { GUEST_USER_ID_PREFIX, isGuestUserId } from '../auth/authConfig';
import {
  getVoiraClientVersion,
  VOIRA_CLIENT_VERSION_HEADER,
} from '../../config/clientVersion';

export const GUEST_ID_HEADER = 'x-guest-id';

function withClientVersionHeader(
  headers: Record<string, string>,
): Record<string, string> {
  const clientVersion = getVoiraClientVersion();
  if (!clientVersion) {
    return headers;
  }
  return {
    ...headers,
    [VOIRA_CLIENT_VERSION_HEADER]: clientVersion,
  };
}

export async function buildAnalysisUploadHeaders(
  userId?: string,
): Promise<Record<string, string>> {
  const session = await getCurrentSession();
  const accessToken = session?.access_token?.trim();

  if (accessToken) {
    return withClientVersionHeader({
      Authorization: `Bearer ${accessToken}`,
    });
  }

  let guestId: string | undefined;
  if (userId && isGuestUserId(userId)) {
    guestId = userId.trim();
  }

  if (!guestId || !guestId.startsWith(GUEST_USER_ID_PREFIX)) {
    guestId = await getOrCreateAnonymousUserId();
  }

  return withClientVersionHeader({
    [GUEST_ID_HEADER]: guestId,
  });
}
