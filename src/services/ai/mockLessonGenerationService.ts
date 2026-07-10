import { createLesson } from '../../data/content/lessonFactory';
import { Lesson, LEVEL_TO_CEFR } from '../../types/lesson';
import { AiLessonGenerationInput, LessonGenerationService } from './aiTypes';

function inferLevelFromProfile(level: AiLessonGenerationInput['userLevel']) {
  if (level === 'beginner') return 'beginner' as const;
  if (level === 'advanced') return 'advanced' as const;
  return 'intermediate' as const; // intermediate + unsure
}

function buildSlowPractice(text: string): string {
  const words = text.replace(/[^\w\s']/g, '').split(/\s+/).filter(Boolean);
  if (words.length <= 3) return words.join(' / ');
  const chunk = Math.ceil(words.length / 3);
  const parts: string[] = [];
  for (let i = 0; i < words.length; i += chunk) {
    parts.push(words.slice(i, i + chunk).join(' '));
  }
  return parts.join(' / ');
}

function sanitizeInput(text: string): string {
  const trimmed = text.trim().slice(0, 200);
  return trimmed || 'I want to practice speaking more naturally.';
}

/**
 * Mock AI lesson generation — returns a valid Lesson object.
 * Future: replace with real LLM API implementing LessonGenerationService.
 */
export function generateLessonMock(input: AiLessonGenerationInput): Lesson {
  const text = sanitizeInput(input.userInputText);
  const level = inferLevelFromProfile(input.userLevel);
  const lessonId = `ai-generated-${hashId(text + input.userGoal)}`;
  const focusSkill = input.userGoal || 'Kişisel konuşma hedefi';

  const primaryWeakArea = input.weakAreas[0] ?? 'akıcılık';
  const pronunciationTip =
    primaryWeakArea.toLowerCase().includes('th')
      ? 'TH sesinde dili dişlerin arasına koy; "t" ile karıştırma.'
      : primaryWeakArea.toLowerCase().includes('bağ')
        ? 'Kelime gruplarını tek nefes gibi bağla.'
        : '"Want to" birleşiminde "t" sesini yumuşat; doğal konuşmada "wanna"ya yaklaşabilir.';

  return createLesson({
    id: lessonId,
    title: 'Kişisel AI Shadowing Dersi',
    subtitle: 'Verdiğin metinden oluşturuldu',
    type: input.preferredContentType ?? 'custom_ai_practice',
    category: 'custom',
    level,
    cefrLevel: LEVEL_TO_CEFR[level],
    estimatedMinutes: 5,
    focusSkill,
    learningObjectiveTr: `${focusSkill} hedefin için kişiselleştirilmiş shadowing pratiği.`,
    isPremium: true,
    sourceType: 'ai_generated',
    copyrightStatus: 'user_provided_short_text',
    segments: [
      {
        id: `${lessonId}-seg-1`,
        order: 1,
        text,
        translationTr: 'Kişisel hedef cümlen — AI tarafından shadowing dersine dönüştürüldü.',
        slowPracticeText: buildSlowPractice(text),
        usageExplanationTr:
          'Bu cümle senin verdiğin metinden oluşturuldu. Gerçek AI entegrasyonunda bağlam ve doğal kullanım otomatik üretilecek.',
        pronunciationTipTr: pronunciationTip,
        commonMistakeTr:
          'Türkçe düşünce sırasıyla kelime kelime okumak — shadowing\'de İngilizce ritmini kopyala.',
        shadowingInstructionTr:
          'Önce yavaş bölümlere ayır, anlamı kavra, sonra doğal ritimle 3 kez tekrar et.',
        focusSkill,
        keywords: text.split(/\s+/).slice(0, 4),
        difficulty: level === 'beginner' ? 'Başlangıç' : level === 'advanced' ? 'İleri' : 'Orta',
      },
    ],
    keywords: ['custom', 'ai', focusSkill],
    tags: ['custom_ai', 'ai_generated', 'premium'],
    aiFeedbackRules: {
      exampleFeedbackTr:
        'Kişisel cümleni anlaşılır söyledin. Bir sonraki denemede kelimeleri daha bağlı söyle.',
      focusAreas: input.weakAreas.length > 0 ? input.weakAreas : ['akıcılık', 'ritim'],
      priorityChecks: ['word linking', 'sentence rhythm', 'stress'],
    },
    quality: {
      accuracyLevel: 'draft',
      contentGoal: 'confidence',
      pedagogyNotesTr: 'Mock AI üretimi — gerçek LLM API entegrasyonu bekliyor.',
      isReviewed: false,
    },
  });
}

function hashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

/** Async wrapper — future real API will be truly async. */
export async function generateLesson(input: AiLessonGenerationInput): Promise<Lesson> {
  // FUTURE: if (USE_REAL_AI) return realLessonGenerationClient.generate(input);
  return generateLessonMock(input);
}

export const mockLessonGenerationService: LessonGenerationService = {
  generate: generateLesson,
};

/** Helper for UI — short AI coaching hints from lesson metadata. */
export function getLessonAiHints(lesson: Lesson): string[] {
  const hints: string[] = [];
  if (lesson.aiFeedbackRules.focusAreas?.length) {
    hints.push(...lesson.aiFeedbackRules.focusAreas.slice(0, 2));
  }
  if (lesson.aiFeedbackRules.exampleFeedbackTr) {
    hints.push(lesson.aiFeedbackRules.exampleFeedbackTr);
  }
  return hints.slice(0, 2);
}
