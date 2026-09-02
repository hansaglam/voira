export interface SpeechToTextInput {
  audioUri: string;
  durationMillis?: number;
  language?: 'en';
  userId?: string;
}

export type SpeechToTextErrorCode =
  | 'not_configured'
  | 'upload_failed'
  | 'transcription_failed'
  | 'empty_audio';

export type SpeechToTextResult =
  | {
      ok: true;
      transcript: string;
      confidence: number;
      words: string[];
    }
  | {
      ok: false;
      errorCode: SpeechToTextErrorCode;
      messageTr: string;
    };
