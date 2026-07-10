import { contentCatalog, CATALOG_COUNTS } from '../src/data/content/catalog/index';
import { resolveLessonPremium } from '../src/utils/lessonUtils';
import { getRecommendedLessons } from '../src/data/learningAlgorithm';
import { createDefaultLearningProfile } from '../src/types/learning';
import type { Lesson, LessonCategory } from '../src/types/lesson';

const PLACEHOLDER = /placeholder|TODO|lorem|test lesson|dev only|mock catalog/i;
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const TARGET_CATS: LessonCategory[] = [
  'daily',
  'cafe_restaurant',
  'travel',
  'job_interview',
  'pronunciation',
];

function sortLikeCategoryScreen(lessons: typeof contentCatalog) {
  return [...lessons].sort((a, b) => {
    const aPremium = resolveLessonPremium(a);
    const bPremium = resolveLessonPremium(b);
    if (aPremium !== bPremium) return aPremium ? 1 : -1;
    const lo = { beginner: 0, intermediate: 1, advanced: 2 };
    const levelDiff = lo[a.level] - lo[b.level];
    if (levelDiff !== 0) return levelDiff;
    return a.title.localeCompare(b.title, 'tr');
  });
}

function dedupeByTitle(lessons: typeof contentCatalog) {
  const byKey = new Map<string, (typeof contentCatalog)[0]>();
  for (const lesson of lessons) {
    const key = `${lesson.category}:${lesson.title.trim().toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, lesson);
  }
  return Array.from(byKey.values());
}

const longSegments: string[] = [];
const longShadowing: string[] = [];
const longSubtitles: string[] = [];
const placeholderHits: string[] = [];
const beginnerHard: string[] = [];
const duplicateTitles: string[] = [];

for (const cat of TARGET_CATS) {
  const lessons = contentCatalog.filter((l) => l.category === cat);
  const titleMap = new Map<string, string[]>();
  for (const l of lessons) {
    const key = l.title.trim().toLowerCase();
    if (!titleMap.has(key)) titleMap.set(key, []);
    titleMap.get(key)!.push(l.id);
  }
  for (const [title, ids] of titleMap) {
    if (ids.length > 1) duplicateTitles.push(`${cat}: "${title}" -> ${ids.join(', ')}`);
  }
}

for (const lesson of contentCatalog) {
  if (PLACEHOLDER.test(`${lesson.id} ${lesson.title} ${lesson.subtitle}`)) {
    placeholderHits.push(`${lesson.id} (${lesson.title})`);
  }
  if (wordCount(lesson.subtitle) > 12) {
    longSubtitles.push(`${lesson.id}: ${lesson.subtitle}`);
  }
  for (const seg of lesson.segments) {
    const wc = wordCount(seg.text);
    if (wc > 16) {
      longSegments.push(`${lesson.id}/${seg.id} (${wc}w): ${seg.text.slice(0, 90)}`);
    }
    if ((seg.shadowingInstructionTr?.length ?? 0) > 220) {
      longShadowing.push(
        `${lesson.id}/${seg.id} (${seg.shadowingInstructionTr!.length}c)`,
      );
    }
    if (lesson.level === 'beginner' && wc > 12) {
      beginnerHard.push(`${lesson.id}/${seg.id} (${wc}w)`);
    }
    const blob = [seg.text, seg.translationTr, seg.pronunciationTipTr, seg.usageExplanationTr].join(
      ' ',
    );
    if (PLACEHOLDER.test(blob)) placeholderHits.push(`${lesson.id}/${seg.id}`);
  }
}

function dedupeForCategoryCounts(lessonList: Lesson[]): Lesson[] {
  const byKey = new Map<string, Lesson>();
  for (const lesson of lessonList) {
    const key = `${lesson.category}:${lesson.title.trim().toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, lesson);
  }
  return Array.from(byKey.values());
}

const profile = createDefaultLearningProfile();
const recommended = getRecommendedLessons(profile, contentCatalog, 3);

console.log('=== CATALOG TOTALS ===');
console.log(`Raw catalog lessons: ${contentCatalog.length}`);
console.log(`CATALOG_COUNTS.total: ${CATALOG_COUNTS.total}`);
console.log(`Production lessons: ${CATALOG_COUNTS.production_speaking}`);
const uiDedupedTotal = [
  'daily',
  'cafe_restaurant',
  'travel',
  'job_interview',
  'series_english',
  'pronunciation',
  'custom',
].reduce((s, cat) => {
  return s + dedupeForCategoryCounts(contentCatalog.filter((l) => l.category === cat)).length;
}, 0);
console.log(`UI category sum (title-deduped): ${uiDedupedTotal}`);
console.log('');

console.log('=== 5 MAIN CATEGORIES (raw in catalog) ===');
for (const cat of TARGET_CATS) {
  const lessons = contentCatalog.filter((l) => l.category === cat);
  const free = lessons.filter((l) => !l.isPremium).length;
  const premium = lessons.filter((l) => l.isPremium).length;
  const prod = lessons.filter((l) => l.id.includes('-prod-')).length;
  const uiDeduped = dedupeByTitle(lessons).length;
  console.log(
    `${cat}: raw=${lessons.length} ui_deduped=${uiDeduped} free=${free} premium=${premium} prod=${prod}`,
  );
}

console.log('');
console.log('=== FREE-FIRST (first 3 after CategoryLessons sort) ===');
for (const cat of TARGET_CATS) {
  const sorted = sortLikeCategoryScreen(contentCatalog.filter((l) => l.category === cat));
  const first3 = sorted.slice(0, 3);
  const freeCount = first3.filter((l) => !l.isPremium).length;
  console.log(
    `${cat} [${freeCount}/3 free]: ${first3.map((l) => `${l.isPremium ? 'P' : 'F'} ${l.title}`).join(' | ')}`,
  );
}

console.log('');
console.log('=== HOME RECOMMENDED (free user, default profile) ===');
for (const l of recommended) {
  console.log(
    `${l.isPremium ? 'P' : 'F'} ${l.title} (${l.category}) — ${l.focusSkill}`,
  );
}

console.log('');
console.log('=== DUPLICATE TITLES IN CATEGORY ===');
duplicateTitles.forEach((d) => console.log(`  ${d}`));

console.log('');
console.log('=== LONG SEGMENTS (>16 words) ===');
console.log(`count: ${longSegments.length}`);
longSegments.slice(0, 20).forEach((s) => console.log(`  ${s}`));

console.log('');
console.log('=== LONG SHADOWING (>220 chars) ===');
console.log(`count: ${longShadowing.length}`);
longShadowing.slice(0, 15).forEach((s) => console.log(`  ${s}`));

console.log('');
console.log('=== LONG SUBTITLES (>12 words) ===');
longSubtitles.forEach((s) => console.log(`  ${s}`));

console.log('');
console.log('=== PLACEHOLDER / DEV STRINGS ===');
placeholderHits.forEach((s) => console.log(`  ${s}`));

console.log('');
console.log('=== BEGINNER SEGMENTS >12 WORDS ===');
console.log(`count: ${beginnerHard.length}`);
beginnerHard.slice(0, 20).forEach((s) => console.log(`  ${s}`));

const prodLessons = contentCatalog.filter((l) => l.id.includes('-prod-'));
const prodShadowingLengths = prodLessons.flatMap((l) =>
  l.segments.map((s) => ({
    id: `${l.id}/${s.id}`,
    len: s.shadowingInstructionTr?.length ?? 0,
    text: s.shadowingInstructionTr ?? '',
  })),
);
const avgShadow = prodShadowingLengths.reduce((s, x) => s + x.len, 0) / prodShadowingLengths.length;
console.log('');
console.log('=== PRODUCTION SHADOWING LENGTH ===');
console.log(`avg chars: ${Math.round(avgShadow)}`);
prodShadowingLengths
  .sort((a, b) => b.len - a.len)
  .slice(0, 8)
  .forEach((x) => console.log(`  ${x.id} (${x.len}c): ${x.text.slice(0, 100)}...`));

console.log('');
console.log('=== TITLE LENGTH (>28 chars may clip on dense cards) ===');
contentCatalog
  .filter((l) => l.title.length > 28)
  .forEach((l) => console.log(`  ${l.id}: "${l.title}" (${l.title.length}c)`));

console.log('');
console.log('=== COUNT MISMATCH: Categories vs CategoryLessons ===');
for (const cat of ['daily', 'cafe_restaurant', 'travel', 'job_interview', 'pronunciation', 'series_english', 'custom'] as LessonCategory[]) {
  const raw = contentCatalog.filter((l) => l.category === cat).length;
  const deduped = dedupeForCategoryCounts(contentCatalog.filter((l) => l.category === cat)).length;
  if (raw !== deduped) console.log(`  ${cat}: categories=${deduped} detail=${raw} (Δ${raw - deduped})`);
}

console.log('');
console.log('=== PRODUCTION LESSON POSITION IN SORTED LIST ===');
for (const cat of TARGET_CATS) {
  const sorted = sortLikeCategoryScreen(contentCatalog.filter((l) => l.category === cat));
  const prodPositions = sorted
    .map((l, i) => (l.id.includes('-prod-') ? i + 1 : null))
    .filter((x): x is number => x !== null);
  console.log(`  ${cat}: prod at ranks ${prodPositions.join(', ')} (of ${sorted.length})`);
}
