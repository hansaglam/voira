import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import {
  hasPronunciationScores,
  parseAzurePronunciationPayload,
  summarizeAzureRestResponse,
} from './azurePronunciationResultParser.js';
import {
  buildPronunciationAssessmentHeader,
  getAzurePronunciationRestEndpoint,
} from './azurePronunciationRestService.js';
import {
  isAzureSdkFallbackAllowed,
  resolveAzurePronunciationTransport,
} from './pronunciationAssessmentConfig.js';

const originalTransport = process.env.AZURE_PRONUNCIATION_TRANSPORT;
const originalNodeEnv = process.env.NODE_ENV;
const originalSdkFallback = process.env.AZURE_PRONUNCIATION_ALLOW_SDK_FALLBACK;

afterEach(() => {
  if (originalTransport === undefined) {
    delete process.env.AZURE_PRONUNCIATION_TRANSPORT;
  } else {
    process.env.AZURE_PRONUNCIATION_TRANSPORT = originalTransport;
  }

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalSdkFallback === undefined) {
    delete process.env.AZURE_PRONUNCIATION_ALLOW_SDK_FALLBACK;
  } else {
    process.env.AZURE_PRONUNCIATION_ALLOW_SDK_FALLBACK = originalSdkFallback;
  }
});

const realisticAzureRestResponse = {
  RecognitionStatus: 'Success',
  Offset: 700000,
  Duration: 8400000,
  DisplayText: 'Good morning.',
  SNR: 38.76819,
  NBest: [
    {
      Confidence: 0.98503506,
      Lexical: 'good morning',
      Display: 'Good morning.',
      AccuracyScore: 100.0,
      FluencyScore: 100.0,
      ProsodyScore: 87.8,
      CompletenessScore: 100.0,
      PronScore: 95.1,
      Words: [
        {
          Word: 'good',
          Offset: 700000,
          Duration: 2600000,
          AccuracyScore: 100.0,
          ErrorType: 'None',
          Phonemes: [
            { Phoneme: 'g', AccuracyScore: 100.0 },
            { Phoneme: 'uh', AccuracyScore: 95.0 },
            { Phoneme: 'd', AccuracyScore: 100.0 },
          ],
        },
        {
          Word: 'morning',
          Offset: 3400000,
          Duration: 5700000,
          AccuracyScore: 92.0,
          ErrorType: 'None',
          Phonemes: [
            { Phoneme: 'm', AccuracyScore: 94.0 },
            { Phoneme: 'ao', AccuracyScore: 90.0 },
            { Phoneme: 'r', AccuracyScore: 91.0 },
            { Phoneme: 'n', AccuracyScore: 93.0 },
            { Phoneme: 'ih', AccuracyScore: 89.0 },
            { Phoneme: 'ng', AccuracyScore: 92.0 },
          ],
        },
      ],
    },
  ],
};

describe('pronunciationAssessment transport', () => {
  test('resolveAzurePronunciationTransport defaults to rest in production', () => {
    delete process.env.AZURE_PRONUNCIATION_TRANSPORT;
    process.env.NODE_ENV = 'production';

    assert.equal(resolveAzurePronunciationTransport(), 'rest');
  });

  test('resolveAzurePronunciationTransport defaults to sdk in development', () => {
    delete process.env.AZURE_PRONUNCIATION_TRANSPORT;
    process.env.NODE_ENV = 'development';

    assert.equal(resolveAzurePronunciationTransport(), 'sdk');
  });

  test('resolveAzurePronunciationTransport honors explicit env override', () => {
    process.env.AZURE_PRONUNCIATION_TRANSPORT = 'rest';
    process.env.NODE_ENV = 'development';

    assert.equal(resolveAzurePronunciationTransport(), 'rest');

    process.env.AZURE_PRONUNCIATION_TRANSPORT = 'sdk';
    process.env.NODE_ENV = 'production';

    assert.equal(resolveAzurePronunciationTransport(), 'sdk');
  });

  test('isAzureSdkFallbackAllowed is false for production rest unless explicitly enabled', () => {
    process.env.AZURE_PRONUNCIATION_TRANSPORT = 'rest';
    process.env.NODE_ENV = 'production';
    delete process.env.AZURE_PRONUNCIATION_ALLOW_SDK_FALLBACK;

    assert.equal(isAzureSdkFallbackAllowed(), false);

    process.env.AZURE_PRONUNCIATION_ALLOW_SDK_FALLBACK = 'true';
    assert.equal(isAzureSdkFallbackAllowed(), true);
  });

  test('getAzurePronunciationRestEndpoint uses regional speech host', () => {
    assert.equal(
      getAzurePronunciationRestEndpoint('eastus'),
      'https://eastus.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1',
    );
  });

  test('buildPronunciationAssessmentHeader encodes expected assessment params', () => {
    const header = buildPronunciationAssessmentHeader('Good morning');
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf8')) as Record<string, unknown>;

    assert.equal(decoded.ReferenceText, 'Good morning');
    assert.equal(decoded.GradingSystem, 'HundredMark');
    assert.equal(decoded.Granularity, 'Phoneme');
    assert.equal(decoded.Dimension, 'Comprehensive');
    assert.equal(decoded.EnableProsodyAssessment, true);
  });

  test('buildPronunciationAssessmentHeader can omit prosody when requested', () => {
    const header = buildPronunciationAssessmentHeader('Good morning', { enableProsodyAssessment: false });
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf8')) as Record<string, unknown>;

    assert.equal(decoded.EnableProsodyAssessment, undefined);
  });

  test('parseAzurePronunciationPayload normalizes nested SDK detailed JSON', () => {
    const parsed = parseAzurePronunciationPayload({
      NBest: [
        {
          PronunciationAssessment: {
            PronScore: 88.4,
            AccuracyScore: 90.2,
            FluencyScore: 85.6,
            CompletenessScore: 100,
            ProsodyScore: 82.1,
          },
          Words: [
            {
              Word: 'hello',
              PronunciationAssessment: {
                AccuracyScore: 92,
                ErrorType: 'None',
              },
              Phonemes: [
                {
                  Phoneme: 'h',
                  PronunciationAssessment: { AccuracyScore: 95 },
                },
              ],
            },
          ],
        },
      ],
    });

    assert.equal(parsed.pronunciationScore, 88);
    assert.equal(parsed.accuracyScore, 90);
    assert.equal(parsed.fluencyScore, 86);
    assert.equal(parsed.completenessScore, 100);
    assert.equal(parsed.prosodyScore, 82);
    assert.equal(parsed.words.length, 1);
    assert.equal(parsed.words[0]?.word, 'hello');
    assert.equal(parsed.words[0]?.accuracyScore, 92);
    assert.equal(parsed.words[0]?.phonemes?.[0]?.phoneme, 'h');
    assert.equal(parsed.words[0]?.phonemes?.[0]?.accuracyScore, 95);
  });

  test('parseAzurePronunciationPayload normalizes flat Azure REST detailed JSON', () => {
    const parsed = parseAzurePronunciationPayload(realisticAzureRestResponse);

    assert.equal(parsed.pronunciationScore, 95);
    assert.equal(parsed.accuracyScore, 100);
    assert.equal(parsed.fluencyScore, 100);
    assert.equal(parsed.completenessScore, 100);
    assert.equal(parsed.prosodyScore, 88);
    assert.equal(parsed.words.length, 2);
    assert.equal(parsed.words[0]?.word, 'good');
    assert.equal(parsed.words[0]?.accuracyScore, 100);
    assert.equal(parsed.words[0]?.phonemes?.[1]?.phoneme, 'uh');
    assert.equal(parsed.words[0]?.phonemes?.[1]?.accuracyScore, 95);
    assert.equal(parsed.words[1]?.word, 'morning');
    assert.equal(parsed.words[1]?.accuracyScore, 92);
    assert.ok(hasPronunciationScores(parsed));
  });

  test('summarizeAzureRestResponse reports flat REST pronunciation keys', () => {
    const summary = summarizeAzureRestResponse(realisticAzureRestResponse, {
      status: 200,
      contentType: 'application/json',
      bodyLength: 1200,
    });

    assert.equal(summary.recognitionStatus, 'Success');
    assert.equal(summary.hasNBest, true);
    assert.equal(summary.nBestCount, 1);
    assert.equal(summary.hasPronunciationAssessment, true);
    assert.ok(summary.firstNBestKeys.includes('PronScore'));
    assert.ok(summary.firstNBestKeys.includes('AccuracyScore'));
    assert.ok(summary.pronunciationAssessmentKeys.includes('PronScore'));
    assert.equal(summary.displayTextLength, 13);
    assert.equal(summary.lexicalLength, 12);
  });
});
