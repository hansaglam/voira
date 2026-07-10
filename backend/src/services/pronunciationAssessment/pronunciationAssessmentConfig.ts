import { IS_DEV } from '../../config.js';
import { isFfmpegAvailable } from '../azureAudioPcm.js';

export const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY?.trim() ?? '';
export const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION?.trim() ?? '';
export const AZURE_SPEECH_LANGUAGE = process.env.AZURE_SPEECH_LANGUAGE?.trim() || 'en-US';

const explicitDisable = process.env.ENABLE_PRONUNCIATION_ASSESSMENT === 'false';

export function isAnalysisDebugEnabled(): boolean {
  return process.env.ENABLE_ANALYSIS_DEBUG === 'true';
}

export function getPronunciationSkipReason(): string | null {
  if (explicitDisable) {
    return 'explicitly_disabled';
  }
  if (!AZURE_SPEECH_KEY) {
    return 'missing_azure_speech_key';
  }
  if (!AZURE_SPEECH_REGION) {
    return 'missing_azure_speech_region';
  }
  return null;
}

export function isAzurePronunciationConfigured(): boolean {
  return Boolean(AZURE_SPEECH_KEY && AZURE_SPEECH_REGION);
}

export function isAzurePronunciationEnabled(): boolean {
  if (explicitDisable) {
    return false;
  }

  return isAzurePronunciationConfigured();
}

export function logAzureSpeechStartupStatus(): void {
  console.log('[EchoSpeak Azure Speech]', {
    hasAzureSpeechKey: Boolean(AZURE_SPEECH_KEY),
    azureSpeechRegion: AZURE_SPEECH_REGION || null,
    azureSpeechLanguage: AZURE_SPEECH_LANGUAGE,
    pronunciationAssessmentEnabled: isAzurePronunciationEnabled(),
    ffmpegAvailable: isFfmpegAvailable(),
    analysisDebugEnabled: isAnalysisDebugEnabled(),
    ...(IS_DEV ? { explicitlyDisabled: explicitDisable } : {}),
  });
}
