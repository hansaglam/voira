export interface PronunciationAssessmentRequest {
  audioBuffer: Buffer;
  mimeType: string;
  referenceText: string;
  language: 'en-US';
  durationMillis: number;
}

export interface PronunciationPhonemeScore {
  phoneme: string;
  accuracyScore?: number;
}

export interface PronunciationWordScore {
  word: string;
  accuracyScore?: number;
  errorType?: string;
  phonemes?: PronunciationPhonemeScore[];
}

export interface PronunciationAssessmentResult {
  ok: boolean;
  provider?: 'azure';
  accuracyScore?: number;
  fluencyScore?: number;
  completenessScore?: number;
  prosodyScore?: number;
  pronunciationScore?: number;
  wordScores?: PronunciationWordScore[];
  errorCode?: string;
  messageTr?: string;
  raw?: unknown;
}

export interface PronunciationAssessmentProvider {
  assess(request: PronunciationAssessmentRequest): Promise<PronunciationAssessmentResult>;
}

export type ScoreSource = 'azure_pronunciation' | 'text_match_only';

export interface AzurePronunciationResponse {
  pronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
}
