import { Platform } from 'react-native';
import {
  AUTH_MOBILE_REDIRECT_URL,
  getMissingAuthEnvVarNames,
  getSupabaseUrl,
  hasSupabaseAnonKey,
  hasSupabaseUrl,
  isSupabaseConfigured,
  isValidSupabaseAnonKeyFormat,
  logAuthConfigDiagnostics,
} from '../services/auth/authConfig';
import { getSupabaseClient } from '../services/auth/supabaseClient';
import {
  hasRevenueCatAndroidKey,
  hasRevenueCatIosKey,
  isPremiumNativePlatform,
  isRevenueCatConfigured,
  PREMIUM_ENTITLEMENT_ID,
} from '../services/premium/premiumConfig';

const LOG_PREFIX = '[EchoSpeak Services]';

export interface ServicesConfigStatus {
  platform: string;
  supabase: {
    configured: boolean;
    hasUrl: boolean;
    hasAnonKey: boolean;
    validAnonKeyFormat: boolean;
    urlHost: string | null;
    redirectUrl: string;
  };
  revenueCat: {
    configuredForPlatform: boolean;
    hasAndroidKey: boolean;
    hasIosKey: boolean;
    entitlementId: string;
    nativePlatform: boolean;
  };
  warnings: string[];
}

function maskSupabaseHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function getServicesConfigStatus(): ServicesConfigStatus {
  const supabaseUrl = getSupabaseUrl();
  const warnings: string[] = [];

  for (const name of getMissingAuthEnvVarNames()) {
    warnings.push(`${name} eksik veya geçersiz — hesap girişi kapalı.`);
  }

  if (isSupabaseConfigured()) {
    // Informational — required Supabase dashboard setting for magic links.
    if (__DEV__) {
      console.log(
        `${LOG_PREFIX} Supabase Redirect URL (dashboard): ${AUTH_MOBILE_REDIRECT_URL}`,
      );
    }
  }

  if (!isPremiumNativePlatform()) {
    warnings.push('RevenueCat yalnızca iOS/Android native build üzerinde çalışır.');
  }

  if (Platform.OS === 'android' && !hasRevenueCatAndroidKey()) {
    warnings.push('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY eksik.');
  }

  if (Platform.OS === 'ios' && !hasRevenueCatIosKey()) {
    warnings.push('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY eksik.');
  }

  if (!hasRevenueCatAndroidKey() && !hasRevenueCatIosKey()) {
    warnings.push('RevenueCat API anahtarlarından en az biri gerekli.');
  }

  return {
    platform: Platform.OS,
    supabase: {
      configured: isSupabaseConfigured(),
      hasUrl: hasSupabaseUrl(),
      hasAnonKey: hasSupabaseAnonKey(),
      validAnonKeyFormat: isValidSupabaseAnonKeyFormat(),
      urlHost: supabaseUrl ? maskSupabaseHost(supabaseUrl) : null,
      redirectUrl: AUTH_MOBILE_REDIRECT_URL,
    },
    revenueCat: {
      configuredForPlatform: isRevenueCatConfigured(),
      hasAndroidKey: hasRevenueCatAndroidKey(),
      hasIosKey: hasRevenueCatIosKey(),
      entitlementId: PREMIUM_ENTITLEMENT_ID,
      nativePlatform: isPremiumNativePlatform(),
    },
    warnings,
  };
}

export function logServicesConfigStatus(): void {
  if (!__DEV__) return;

  logAuthConfigDiagnostics();

  const status = getServicesConfigStatus();
  console.log(`${LOG_PREFIX} config`, {
    platform: status.platform,
    supabase: {
      ...status.supabase,
      // Host only — never log URL path or keys.
    },
    revenueCat: {
      configuredForPlatform: status.revenueCat.configuredForPlatform,
      hasAndroidKey: status.revenueCat.hasAndroidKey,
      hasIosKey: status.revenueCat.hasIosKey,
      entitlementId: status.revenueCat.entitlementId,
      nativePlatform: status.revenueCat.nativePlatform,
    },
  });

  for (const warning of status.warnings) {
    console.warn(`${LOG_PREFIX} ${warning}`);
  }

  if (status.supabase.configured && status.revenueCat.configuredForPlatform) {
    console.log(`${LOG_PREFIX} Supabase ve RevenueCat yapılandırması yüklendi.`);
  }
}

export async function verifySupabaseConnection(): Promise<{
  ok: boolean;
  errorMessage?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { ok: false, errorMessage: 'Supabase yapılandırılmamış.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, errorMessage: 'Supabase istemcisi oluşturulamadı.' };
  }

  try {
    const { error } = await client.auth.getSession();
    if (error) {
      if (__DEV__) {
        console.warn(`${LOG_PREFIX} Supabase bağlantı kontrolü başarısız`, {
          message: error.message,
          name: error.name,
          status: 'status' in error ? (error as { status?: number }).status : undefined,
        });
      }
      return { ok: false, errorMessage: error.message };
    }

    if (__DEV__) {
      console.log(`${LOG_PREFIX} Supabase bağlantı kontrolü başarılı`);
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} Supabase bağlantı kontrolü hata`, { message });
    }
    return { ok: false, errorMessage: message };
  }
}

export async function initializeServicesConfig(): Promise<void> {
  logServicesConfigStatus();

  if (isSupabaseConfigured()) {
    await verifySupabaseConnection();
  }
}
