/**
 * Coaching language rules for AI / template coach feedback.
 * Practice target sentences stay English; feedback language follows uiLanguage.
 */

export const COACH_FEEDBACK_LANGUAGE_RULES = `
Coaching feedback language must match uiLanguage (tr, en, es, pt, id, or ar).
The English practice / target sentence must remain English.
Do not translate the target English sentence.
Keep feedback short, encouraging, and actionable.
Do not invent Azure scores; use only provided analysis metrics.
`.trim();

/** Whisper / STT hint: lesson practice audio is English. */
export const PRACTICE_AUDIO_LANGUAGE = 'en' as const;
