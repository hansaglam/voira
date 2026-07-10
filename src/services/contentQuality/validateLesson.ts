import { Lesson } from '../../types/lesson';
import { LessonSegment } from '../../types/segment';
import {
  DURATION_WARNING_LIMITS,
  GENERIC_MISTAKE_PATTERNS,
  PEDAGOGY_USAGE_KEYWORDS,
  PREMIUM_SHOULD_BE_PAID_TYPES,
  REQUIRED_LESSON_FIELDS,
  REQUIRED_SEGMENT_FIELDS,
  SAFE_COPYRIGHT_STATUSES,
  SOURCE_URL_ALLOWED_STATUSES,
  VAGUE_SHADOWING_PATTERNS,
  WPM_TARGETS,
} from './contentQualityRules';
import { ContentQualityIssue, LessonQualityReport } from './contentQualityTypes';

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function includesAny(text: string, terms: readonly string[]): boolean {
  const normalized = text.toLocaleLowerCase('tr-TR');
  return terms.some((term) => normalized.includes(term));
}

function pushIssue(
  issues: ContentQualityIssue[],
  issue: Omit<ContentQualityIssue, 'lessonId'> & { lessonId: string },
): void {
  issues.push(issue);
}

function validateRequiredLessonFields(lesson: Lesson, issues: ContentQualityIssue[]): void {
  for (const field of REQUIRED_LESSON_FIELDS) {
    if (isEmpty(lesson[field])) {
      pushIssue(issues, {
        lessonId: lesson.id,
        severity: 'error',
        category: 'missing_field',
        messageTr: `Ders alanı eksik: ${field}`,
        suggestionTr: `Lutfen "${field}" alanını doldurun.`,
      });
    }
  }
}

function validateRequiredSegmentFields(
  lessonId: string,
  segment: LessonSegment,
  issues: ContentQualityIssue[],
): void {
  for (const field of REQUIRED_SEGMENT_FIELDS) {
    if (isEmpty(segment[field])) {
      pushIssue(issues, {
        lessonId,
        segmentId: segment.id,
        severity: 'error',
        category: 'missing_field',
        messageTr: `Segment alanı eksik: ${field}`,
        suggestionTr: `Segment "${segment.id}" icin "${field}" alanını doldurun.`,
      });
    }
  }
}

function validatePedagogy(lesson: Lesson, segment: LessonSegment, issues: ContentQualityIssue[]): void {
  if (!lesson.learningObjectiveTr || lesson.learningObjectiveTr.trim().length < 12) {
    pushIssue(issues, {
      lessonId: lesson.id,
      severity: 'warning',
      category: 'pedagogy',
      messageTr: 'Ders hedefi net degil veya cok kısa.',
      suggestionTr: 'Tek bir acik ogrenme hedefi yazın (kim, neyi, hangi durumda).',
    });
  }

  if (segment.pronunciationTipTr.trim().length < 18) {
    pushIssue(issues, {
      lessonId: lesson.id,
      segmentId: segment.id,
      severity: 'warning',
      category: 'pronunciation_tip',
      messageTr: 'Telaffuz ipucu cok kısa.',
      suggestionTr: 'Hangi sesi, nasil ve neden duzeltmesi gerektigini belirtin.',
    });
  }

  if (
    segment.commonMistakeTr.trim().length < 18 ||
    includesAny(segment.commonMistakeTr, GENERIC_MISTAKE_PATTERNS)
  ) {
    pushIssue(issues, {
      lessonId: lesson.id,
      segmentId: segment.id,
      severity: 'warning',
      category: 'pedagogy',
      messageTr: 'Yaygın hata bolumu eksik veya fazla genel.',
      suggestionTr: 'Somut bir yanlıs ve dogru ornekle anlatın.',
    });
  }

  if (!includesAny(segment.usageExplanationTr, PEDAGOGY_USAGE_KEYWORDS)) {
    pushIssue(issues, {
      lessonId: lesson.id,
      segmentId: segment.id,
      severity: 'warning',
      category: 'pedagogy',
      messageTr: 'Kullanim acıklaması gercek hayat baglamını yeterince vurgulamıyor.',
      suggestionTr: 'Ifadenin hangi durumda ve hangi tonda kullanıldıgını acıklayın.',
    });
  }

  if (
    segment.shadowingInstructionTr.trim().length < 14 ||
    includesAny(segment.shadowingInstructionTr, VAGUE_SHADOWING_PATTERNS)
  ) {
    pushIssue(issues, {
      lessonId: lesson.id,
      segmentId: segment.id,
      severity: 'warning',
      category: 'pedagogy',
      messageTr: 'Shadowing yonergesi cok genel.',
      suggestionTr: 'Ritim, vurgu veya duraklama odağını acık sekilde belirtin.',
    });
  }
}

function validateDurationAndWpm(lesson: Lesson, segment: LessonSegment, issues: ContentQualityIssue[]): void {
  if (typeof segment.durationSeconds === 'number') {
    const limit = DURATION_WARNING_LIMITS[lesson.level];
    if (segment.durationSeconds > limit) {
      pushIssue(issues, {
        lessonId: lesson.id,
        segmentId: segment.id,
        severity: 'warning',
        category: 'duration',
        messageTr: `Segment suresi (${segment.durationSeconds} sn) seviye icin uzun olabilir.`,
        suggestionTr: `Bu seviye icin segment suresini ${limit} saniye veya altına cekin.`,
      });
    }
  }

  if (typeof segment.speechRateWpm === 'number') {
    const target = WPM_TARGETS[lesson.level];
    if (segment.speechRateWpm > target.max) {
      pushIssue(issues, {
        lessonId: lesson.id,
        segmentId: segment.id,
        severity: 'warning',
        category: 'wpm',
        messageTr: `Konusma hızı (${segment.speechRateWpm} WPM) bu seviye icin fazla yuksek.`,
        suggestionTr: `${lesson.level} icin hedef aralık: ${target.min}-${target.max} WPM.`,
      });
    }
  }
}

function validateCopyright(lesson: Lesson, issues: ContentQualityIssue[]): void {
  if (lesson.copyrightStatus === 'unknown') {
    pushIssue(issues, {
      lessonId: lesson.id,
      severity: 'error',
      category: 'copyright',
      messageTr: 'Telif durumu bilinmiyor.',
      suggestionTr: 'Bu dersi guvenli bir telif durumu ile etiketleyin.',
    });
  }

  if (
    lesson.sourceType === 'future_external' &&
    !(SAFE_COPYRIGHT_STATUSES as readonly string[]).includes(lesson.copyrightStatus)
  ) {
    pushIssue(issues, {
      lessonId: lesson.id,
      severity: 'error',
      category: 'copyright',
      messageTr: 'Harici kaynakta guvenli/lisanslı telif zorunlu.',
      suggestionTr: 'safe_original, licensed_required, public_domain veya user_provided_short_text kullanın.',
    });
  }

  if (
    lesson.type === 'song_rhythm_practice' &&
    lesson.copyrightStatus !== 'safe_original' &&
    lesson.copyrightStatus !== 'user_provided_short_text'
  ) {
    pushIssue(issues, {
      lessonId: lesson.id,
      severity: 'error',
      category: 'copyright',
      messageTr: 'Sarki ritim dersleri yalnizca guvenli orijinal/kullanıcı kısa metni olabilir.',
      suggestionTr: 'safe_original veya user_provided_short_text kullanın.',
    });
  }

  if (
    lesson.sourceUrl &&
    !(SOURCE_URL_ALLOWED_STATUSES as readonly string[]).includes(lesson.copyrightStatus)
  ) {
    pushIssue(issues, {
      lessonId: lesson.id,
      severity: 'warning',
      category: 'copyright',
      messageTr: 'Kaynak URL var ama telif etiketi yetersiz.',
      suggestionTr: 'licensed_required, public_domain veya user_provided_short_text etiketlerinden birini kullanın.',
    });
  }
}

function validatePremiumLogic(lesson: Lesson, issues: ContentQualityIssue[]): void {
  if (PREMIUM_SHOULD_BE_PAID_TYPES.includes(lesson.type) && !lesson.isPremium) {
    pushIssue(issues, {
      lessonId: lesson.id,
      severity: 'warning',
      category: 'premium_logic',
      messageTr: `${lesson.type} ders tipi ucretsiz olarak isaretlenmis.`,
      suggestionTr: 'Bu tipleri premium yapmanız onerilir.',
    });
  }
}

function validateLanguageSignals(lesson: Lesson, segment: LessonSegment, issues: ContentQualityIssue[]): void {
  if (/[çğıöşüİ]/.test(segment.text)) {
    pushIssue(issues, {
      lessonId: lesson.id,
      segmentId: segment.id,
      severity: 'warning',
      category: 'unnatural_english',
      messageTr: 'Ingilizce metinde Turkce karakterler tespit edildi.',
      suggestionTr: 'Segment text alanını dogal Ingilizce ile tekrar kontrol edin.',
    });
  }

  if (
    segment.translationTr.trim().length < 8 ||
    segment.translationTr.trim().toLocaleLowerCase('tr-TR') ===
      segment.text.trim().toLocaleLowerCase('tr-TR')
  ) {
    pushIssue(issues, {
      lessonId: lesson.id,
      segmentId: segment.id,
      severity: 'warning',
      category: 'weak_translation',
      messageTr: 'Turkce ceviri zayıf veya metinle aynı gorunuyor.',
      suggestionTr: 'Dogal, konusma diline uygun bir Turkce ceviri yazın.',
    });
  }
}

function calculateLessonScore(issues: ContentQualityIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'error') score -= 15;
    else if (issue.severity === 'warning') score -= 5;
    else score -= 1;
  }
  return Math.max(0, score);
}

export function validateLesson(lesson: Lesson): LessonQualityReport {
  const issues: ContentQualityIssue[] = [];

  validateRequiredLessonFields(lesson, issues);
  validateCopyright(lesson, issues);
  validatePremiumLogic(lesson, issues);

  lesson.segments.forEach((segment) => {
    validateRequiredSegmentFields(lesson.id, segment, issues);
    validatePedagogy(lesson, segment, issues);
    validateDurationAndWpm(lesson, segment, issues);
    validateLanguageSignals(lesson, segment, issues);
  });

  const score = calculateLessonScore(issues);
  const hasError = issues.some((issue) => issue.severity === 'error');
  const hasWarning = issues.some((issue) => issue.severity === 'warning');
  const status: LessonQualityReport['status'] = hasError
    ? 'draft'
    : hasWarning || score < 85
      ? 'needs_review'
      : 'ready';

  return {
    lessonId: lesson.id,
    title: lesson.title,
    issues,
    score,
    status,
  };
}
