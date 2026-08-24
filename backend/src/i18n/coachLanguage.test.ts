import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCoachLanguage, DEFAULT_COACH_LANGUAGE } from '../i18n/uiLanguage.js';
import { getAnalyzeErrorCopy } from '../i18n/analyzeErrors.js';
import { getCoachCopy } from '../i18n/coachCopy.js';
import { COACH_FEEDBACK_LANGUAGE_RULES, PRACTICE_AUDIO_LANGUAGE } from '../i18n/coachPromptRules.js';
import { buildCoachFeedbackTr } from '../services/coachFeedbackService.js';
import { compareTranscriptToTarget } from '../services/textComparisonService.js';
import { buildAnalysisScores } from '../services/speechScoreService.js';
import { detectWeakAreas } from '../services/weakAreaDetectionService.js';

test('resolveCoachLanguage falls back to en for missing/unsupported values', () => {
  assert.equal(resolveCoachLanguage(undefined), DEFAULT_COACH_LANGUAGE);
  assert.equal(resolveCoachLanguage(null), 'en');
  assert.equal(resolveCoachLanguage(''), 'en');
  assert.equal(resolveCoachLanguage('fr'), 'en');
  assert.equal(resolveCoachLanguage('de-DE'), 'en');
});

test('resolveCoachLanguage accepts supported languages and locale tags', () => {
  for (const lang of ['tr', 'en', 'es', 'pt', 'id', 'ar'] as const) {
    assert.equal(resolveCoachLanguage(lang), lang);
  }
  assert.equal(resolveCoachLanguage('es-ES'), 'es');
  assert.equal(resolveCoachLanguage('pt_BR'), 'pt');
  assert.equal(resolveCoachLanguage('EN'), 'en');
});

test('coach prompt rules keep English practice sentences', () => {
  assert.match(COACH_FEEDBACK_LANGUAGE_RULES, /uiLanguage/i);
  assert.match(COACH_FEEDBACK_LANGUAGE_RULES, /must remain English/i);
  assert.match(COACH_FEEDBACK_LANGUAGE_RULES, /Do not translate the target English sentence/i);
  assert.equal(PRACTICE_AUDIO_LANGUAGE, 'en');
});

test('analyze error copy is localized per uiLanguage', () => {
  assert.match(getAnalyzeErrorCopy('tr').missingAudio, /Ses dosyası/);
  assert.match(getAnalyzeErrorCopy('en').missingAudio, /Audio file/);
  assert.match(getAnalyzeErrorCopy('es').missingAudio, /audio/i);
  assert.match(getAnalyzeErrorCopy('pt').missingAudio, /áudio|audio/i);
  assert.match(getAnalyzeErrorCopy('id').missingAudio, /audio/i);
  assert.ok(getAnalyzeErrorCopy('ar').missingAudio.length > 5);
});

test('buildCoachFeedbackTr localizes wrong-sentence coach copy by uiLanguage', () => {
  const target = 'Good morning! How are you doing today?';
  const transcript = 'good night i m fine';
  const comparison = compareTranscriptToTarget(transcript, target);
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3126,
    targetText: target,
  });
  const weakAreas = detectWeakAreas(target, transcript, comparison, 3126);
  const base = {
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas,
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
  } as const;

  const samples: Array<{ lang: 'tr' | 'en' | 'es' | 'pt' | 'id' | 'ar'; re: RegExp }> = [
    { lang: 'tr', re: /Hedef cümleden farklı/i },
    { lang: 'en', re: /different from the target sentence/i },
    { lang: 'es', re: /frase objetivo|diferente/i },
    { lang: 'pt', re: /frase-alvo|diferente/i },
    { lang: 'id', re: /kalimat target|berbeda/i },
    { lang: 'ar', re: /الجملة الهدف|مختلفاً|مختلف/ },
  ];

  for (const sample of samples) {
    const coach = buildCoachFeedbackTr({ ...base, uiLanguage: sample.lang });
    assert.equal(coach.feedbackType, 'wrong_sentence');
    assert.match(coach.aiCoachCommentTr, sample.re);
    // Practice target stays English in feedback context (not translated as coach body language alone).
    assert.ok(!/Buenos días|Bom dia|Selamat pagi/.test(coach.aiCoachCommentTr));
  }
});

test('getCoachCopy exposes short actionable feedback for all supported languages', () => {
  for (const lang of ['tr', 'en', 'es', 'pt', 'id', 'ar'] as const) {
    const copy = getCoachCopy(lang);
    assert.ok(copy.wrongSentence.length > 10);
    assert.ok(copy.nextFocus.wrongSentence.length > 8);
    assert.ok(copy.goodResult.length > 8);
  }
});
