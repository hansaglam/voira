import OpenAI, { toFile } from 'openai';
import { APIError } from 'openai';
import { IS_DEV, OPENAI_API_KEY } from '../config.js';
import { analysisErrorLog } from '../utils/analysisDebugLog.js';
import { normalizeForComparison } from '../utils/normalize.js';

export interface UploadedAudioFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface TranscriptionResult {
  ok: boolean;
  transcript?: string;
  confidence?: number;
  errorCode?: string;
  messageTr?: string;
}

const STT_NOT_CONFIGURED_TR = 'Konuşma analizi şu anda yapılandırılmamış.';

const STT_FAILED_TR =
  'Konuşman çözümlenirken bir sorun oluştu. Lütfen tekrar dene.';

const EMPTY_TRANSCRIPT_TR =
  'Konuşmanı net algılayamadım. Lütfen daha net şekilde tekrar söyle.';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openaiClient;
}

function inferMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'm4a':
      return 'audio/m4a';
    case 'mp4':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'audio/webm';
    case 'mp3':
      return 'audio/mpeg';
    case 'caf':
      return 'audio/x-caf';
    case '3gp':
      return 'audio/3gpp';
    default:
      return 'audio/m4a';
  }
}

function ensureAudioFilename(originalname: string | undefined): string {
  const trimmed = originalname?.trim();
  if (!trimmed) return 'recording.m4a';
  if (!trimmed.includes('.')) return `${trimmed}.m4a`;
  return trimmed;
}

function logTranscriptionError(error: unknown): void {
  const record =
    error && typeof error === 'object' ? (error as Record<string, unknown>) : {};

  analysisErrorLog('[EchoSpeak STT] transcription_error', {
    name: typeof record.name === 'string' ? record.name : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
  });
}

/**
 * Server-side speech-to-text via OpenAI Whisper.
 * OPENAI_API_KEY must only exist on the server.
 */
export async function transcribeAudio(file: UploadedAudioFile): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? OPENAI_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      errorCode: 'backend_not_configured',
      messageTr: STT_NOT_CONFIGURED_TR,
    };
  }

  const filename = ensureAudioFilename(file.originalname);
  const mimeType = file.mimetype || inferMimeType(filename);

  try {
    const audioFile = await toFile(file.buffer, filename, { type: mimeType });
    const openai = getOpenAIClient();

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'json',
    });

    const rawTranscript = transcription.text?.trim() ?? '';
    const transcript = normalizeForComparison(rawTranscript);

    if (!transcript) {
      return {
        ok: false,
        errorCode: 'empty_transcript',
        messageTr: EMPTY_TRANSCRIPT_TR,
      };
    }

    return {
      ok: true,
      transcript,
      confidence: 0.85,
    };
  } catch (error) {
    logTranscriptionError(error);

    if (IS_DEV && error instanceof APIError) {
      console.error('[EchoSpeak STT] transcription_api_error', {
        status: error.status,
        code: error.code,
        type: error.type,
        message: error.message,
      });
    }

    return {
      ok: false,
      errorCode: 'transcription_failed',
      messageTr: STT_FAILED_TR,
    };
  }
}
