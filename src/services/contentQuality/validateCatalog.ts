import { Lesson } from '../../types/lesson';
import { CatalogQualityReport, ContentQualityIssue } from './contentQualityTypes';
import { validateLesson } from './validateLesson';

function calculateCatalogScore(totalScore: number, totalLessons: number): number {
  if (totalLessons === 0) return 0;
  return Math.round(totalScore / totalLessons);
}

export function validateCatalog(lessons: Lesson[]): CatalogQualityReport {
  const lessonReports = lessons.map((lesson) => validateLesson(lesson));
  const issues: ContentQualityIssue[] = lessonReports.flatMap((report) => report.issues);

  const readyLessons = lessonReports.filter((report) => report.status === 'ready').length;
  const needsReviewLessons = lessonReports.filter(
    (report) => report.status === 'needs_review',
  ).length;
  const draftLessons = lessonReports.filter((report) => report.status === 'draft').length;

  const totalScore = lessonReports.reduce((sum, report) => sum + report.score, 0);
  const score = calculateCatalogScore(totalScore, lessonReports.length);

  return {
    totalLessons: lessonReports.length,
    readyLessons,
    needsReviewLessons,
    draftLessons,
    issues,
    score,
    lessonReports,
  };
}

export function printContentQualitySummary(report: CatalogQualityReport): void {
  const errorCount = report.issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = report.issues.filter((issue) => issue.severity === 'warning').length;
  const lowestScoringLessons = [...report.lessonReports]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((item) => `${item.lessonId} (${item.score})`);

  console.log('[EchoSpeak Content Quality] total lessons:', report.totalLessons);
  console.log('[EchoSpeak Content Quality] ready:', report.readyLessons);
  console.log('[EchoSpeak Content Quality] needs review:', report.needsReviewLessons);
  console.log('[EchoSpeak Content Quality] draft:', report.draftLessons);
  console.log('[EchoSpeak Content Quality] errors:', errorCount);
  console.log('[EchoSpeak Content Quality] warnings:', warningCount);
  console.log('[EchoSpeak Content Quality] lowest scoring lessons:', lowestScoringLessons);
}
