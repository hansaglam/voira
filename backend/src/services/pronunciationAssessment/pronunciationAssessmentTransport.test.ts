import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { parseAzurePronunciationPayload } from './azurePronunciationResultParser.js';
import {
  buildPronunciationAssessmentHeader,
  getAzurePronunciationRestEndpoint,
} from './azurePronunciationRestService.js';
import { resolveAzurePronunciationTransport } from './pronunciationAssessmentConfig.js';

const originalTransport = process.env.AZURE_PRONUNCIATION_TRANSPORT;
const originalNodeEnv = process.env.NODE_ENV;

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
});

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

  test('parseAzurePronunciationPayload normalizes Azure detailed JSON', () => {
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
});
