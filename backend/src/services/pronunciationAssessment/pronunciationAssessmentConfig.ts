import { IS_DEV } from '../../config.js';

export const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY?.trim() ?? '';
export const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION?.trim() ?? '';
export const AZURE_SPEECH_LANGUAGE = process.env.AZURE_SPEECH_LANGUAGE?.trim() || 'en-US';

const explicitDisable = process.env.ENABLE_PRONUNCIATION_ASSESSMENT === 'false';

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
    ...(IS_DEV ? { explicitlyDisabled: explicitDisable } : {}),
  });
}
