import assert from 'node:assert/strict';
import test from 'node:test';

import type { Lesson } from '../types/lesson';
import { localizedLessonFocus } from './lessonLocalization';

const lesson = {
  title: 'Morning Greeting',
  focusSkill: 'Günlük selamlaşma',
  aiFeedbackRules: {
    exampleFeedbackTr: 'Selamlaşma tonun iyi.',
    focusAreas: ['greeting tone', 'question intonation'],
  },
} as Lesson;

test('uses English coaching metadata instead of Turkish focus text in English locales', () => {
  assert.equal(localizedLessonFocus(lesson, 'en'), 'greeting tone');
});

test('keeps the Turkish catalog focus in Turkish locales', () => {
  assert.equal(localizedLessonFocus(lesson, 'tr-TR'), 'Günlük selamlaşma');
});

test('falls back to the canonical English title when English focus metadata is absent', () => {
  assert.equal(
    localizedLessonFocus({ ...lesson, aiFeedbackRules: { exampleFeedbackTr: 'Tamam.' } }, 'en'),
    'Morning Greeting',
  );
});
