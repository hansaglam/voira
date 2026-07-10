import { ENABLE_MOCK_ANALYSIS_IN_DEV } from './analysisConfig';

/**
 * Full URL for speech analysis upload, e.g. https://api.example.com/api/analyze-speech
 * Set via EXPO_PUBLIC_ANALYSIS_ENDPOINT — no API keys in the app.
 */
export const BACKEND_ANALYSIS_ENDPOINT =
  process.env.EXPO_PUBLIC_ANALYSIS_ENDPOINT?.trim() ?? '';

export type AnalysisProviderMode = 'dev_mock' | 'backend' | 'disabled';

export function isBackendAnalysisEndpointConfigured(): boolean {
  return BACKEND_ANALYSIS_ENDPOINT.length > 0;
}

/**
 * Resolves which analysis provider the app should use.
 * - Dev: backend when endpoint exists, else dev_mock if mock enabled, else disabled
 * - Production: backend when endpoint exists, else disabled (never dev_mock)
 */
export function getAnalysisProviderMode(): AnalysisProviderMode {
  if (isBackendAnalysisEndpointConfigured()) {
    return 'backend';
  }

  if (__DEV__ && ENABLE_MOCK_ANALYSIS_IN_DEV) {
    return 'dev_mock';
  }

  return 'disabled';
}
