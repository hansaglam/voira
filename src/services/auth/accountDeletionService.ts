import { getAccountDeleteEndpoint, isAccountDeleteEndpointConfigured } from '../../config/analysisProviderConfig';
import { ACCOUNT_DELETE_TIMEOUT_MS } from '../../config/httpTimeouts';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';
import { getCurrentSession } from './authService';

export type AccountDeletionErrorCode =
  | 'not_configured'
  | 'unauthorized'
  | 'reauth_required'
  | 'network_error'
  | 'delete_failed'
  | 'rate_limited'
  | 'auth_unavailable';

export type AccountDeletionResult =
  | { ok: true }
  | { ok: false; errorCode: AccountDeletionErrorCode; messageTr: string };

const DELETE_FAILED_TR = 'Hesap silinemedi. Lütfen tekrar dene.';
const REAUTH_TR = 'Bu işlem için tekrar giriş yapman gerekebilir.';
const NOT_CONFIGURED_TR =
  'Hesap silme şu an kullanılamıyor. Lütfen daha sonra tekrar dene.';

function mapErrorCode(code: string | undefined): AccountDeletionErrorCode {
  switch (code) {
    case 'unauthorized':
      return 'unauthorized';
    case 'reauth_required':
      return 'reauth_required';
    case 'rate_limited':
      return 'rate_limited';
    case 'auth_unavailable':
      return 'auth_unavailable';
    case 'not_configured':
      return 'not_configured';
    default:
      return 'delete_failed';
  }
}

function mapMessage(errorCode: AccountDeletionErrorCode, messageTr?: string): string {
  if (errorCode === 'reauth_required' || errorCode === 'unauthorized') {
    return REAUTH_TR;
  }
  if (errorCode === 'not_configured' || errorCode === 'auth_unavailable') {
    return messageTr?.trim() || NOT_CONFIGURED_TR;
  }
  if (errorCode === 'rate_limited') {
    return messageTr?.trim() || 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar dene.';
  }
  return messageTr?.trim() || DELETE_FAILED_TR;
}

/**
 * Calls POST /api/account/delete with the current Supabase access token.
 * Does not clear local state — AuthContext handles post-success cleanup.
 */
export async function requestAccountDeletion(): Promise<AccountDeletionResult> {
  if (!isAccountDeleteEndpointConfigured()) {
    return { ok: false, errorCode: 'not_configured', messageTr: NOT_CONFIGURED_TR };
  }

  const session = await getCurrentSession();
  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    return { ok: false, errorCode: 'reauth_required', messageTr: REAUTH_TR };
  }

  try {
    const response = await fetchWithTimeout(
      getAccountDeleteEndpoint(),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({}),
      },
      ACCOUNT_DELETE_TIMEOUT_MS,
    );

    const bodyText = await response.text();
    let payload: {
      ok?: boolean;
      errorCode?: string;
      messageTr?: string;
    } = {};
    try {
      if (bodyText?.trim()) {
        payload = JSON.parse(bodyText) as {
          ok?: boolean;
          errorCode?: string;
          messageTr?: string;
        };
      }
    } catch {
      payload = {};
    }

    if (response.status === 401) {
      return {
        ok: false,
        errorCode: 'reauth_required',
        messageTr: mapMessage('reauth_required', payload.messageTr),
      };
    }

    if (!response.ok || payload.ok === false) {
      const errorCode = mapErrorCode(payload.errorCode);
      return {
        ok: false,
        errorCode,
        messageTr: mapMessage(errorCode, payload.messageTr),
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      errorCode: 'network_error',
      messageTr: DELETE_FAILED_TR,
    };
  }
}
