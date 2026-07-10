import { Lesson } from './lesson';
import { LessonSegment } from './segment';
import {
  AiLessonGenerationInput as ServiceAiLessonGenerationInput,
  generateLessonMock,
} from '../services/ai';

/** @deprecated Import from `src/services/ai` — kept for backward compatibility. */
export type AiLessonGenerationInput = ServiceAiLessonGenerationInput;

/** Flat output shape for legacy callers — prefer full `Lesson` from `generateLessonMock`. */
export interface AiLessonGenerationOutput {
  title: string;
  subtitle: string;
  segments: LessonSegment[];
  learningObjectiveTr: string;
  turkishExplanations: string[];
  pronunciationTipsTr: string[];
  commonMistakesForTurkishSpeakersTr: string[];
  shadowingStepsTr: string[];
  feedbackRules: {
    exampleFeedbackTr: string;
    focusAreas: string[];
    priorityChecks: string[];
  };
  suggestedCategory: Lesson['category'];
  suggestedCefrLevel: Lesson['cefrLevel'];
}

function lessonToGenerationOutput(lesson: Lesson): AiLessonGenerationOutput {
  const segment = lesson.segments[0];
  return {
    title: lesson.title,
    subtitle: lesson.subtitle,
    segments: lesson.segments,
    learningObjectiveTr: lesson.learningObjectiveTr,
    turkishExplanations: lesson.segments.map((s) => s.usageExplanationTr),
    pronunciationTipsTr: lesson.segments.map((s) => s.pronunciationTipTr),
    commonMistakesForTurkishSpeakersTr: lesson.segments.map((s) => s.commonMistakeTr),
    shadowingStepsTr: lesson.segments.map((s) => s.shadowingInstructionTr),
    feedbackRules: {
      exampleFeedbackTr: lesson.aiFeedbackRules.exampleFeedbackTr,
      focusAreas: lesson.aiFeedbackRules.focusAreas ?? [],
      priorityChecks: lesson.aiFeedbackRules.priorityChecks ?? [],
    },
    suggestedCategory: lesson.category,
    suggestedCefrLevel: lesson.cefrLevel,
  };
}

/** Mock placeholder — delegates to `mockLessonGenerationService`. */
export function mockAiLessonGeneration(input: AiLessonGenerationInput): AiLessonGenerationOutput {
  // FUTURE: replace with async `generateLesson()` when real AI API is connected.
  return lessonToGenerationOutput(generateLessonMock(input));
}
