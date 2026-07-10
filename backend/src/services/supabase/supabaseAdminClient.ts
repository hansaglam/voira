import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_AUDIO_BUCKET,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '../../config.js';

const LOG_PREFIX = '[EchoSpeak Supabase]';

let adminClient: SupabaseClient | null | undefined;

export function hasSupabaseUrl(): boolean {
  return SUPABASE_URL.length > 0;
}

export function hasSupabaseServiceRoleKey(): boolean {
  return SUPABASE_SERVICE_ROLE_KEY.length > 0;
}

export function getSupabaseAudioBucket(): string {
  return SUPABASE_AUDIO_BUCKET;
}

export function isSupabaseAdminConfigured(): boolean {
  return hasSupabaseUrl() && hasSupabaseServiceRoleKey();
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  if (adminClient === undefined) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

export function logSupabaseAdminStartupStatus(): void {
  console.log(`${LOG_PREFIX} admin status`, {
    hasSupabaseUrl: hasSupabaseUrl(),
    hasSupabaseServiceRoleKey: hasSupabaseServiceRoleKey(),
    audioBucket: SUPABASE_AUDIO_BUCKET,
    configured: isSupabaseAdminConfigured(),
  });
}
