export interface PronunciationAssessmentRequest {
  audioBuffer: Buffer;
  mimeType: string;
  referenceText: string;
  language: 'en-US';
  durationMillis: number;
}

export interface PronunciationWordScore {
  word: string;
  accuracyScore?: number;
  errorType?: string;
}

export interface PronunciationAssessmentResult {
  ok: boolean;
  accuracyScore?: number;
  fluencyScore?: number;
  completenessScore?: number;
  prosodyScore?: number;
  pronunciationScore?: number;
  wordScores?: PronunciationWordScore[];
  errorCode?: string;
  messageTr?: string;
}

export interface PronunciationAssessmentProvider {
  assess(request: PronunciationAssessmentRequest): Promise<PronunciationAssessmentResult>;
}
