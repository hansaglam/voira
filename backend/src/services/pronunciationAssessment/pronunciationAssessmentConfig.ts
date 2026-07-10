export const ENABLE_PRONUNCIATION_ASSESSMENT =
  process.env.ENABLE_PRONUNCIATION_ASSESSMENT === 'true';

export const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY?.trim() ?? '';
export const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION?.trim() ?? '';

export function isAzurePronunciationConfigured(): boolean {
  return Boolean(AZURE_SPEECH_KEY && AZURE_SPEECH_REGION);
}
