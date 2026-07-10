/**
 * Convert remaining manual shadowingInstructionTr strings to buildShadowingCoach().
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src/data/content/catalog');
const PACK_FILES = [
  'cafeLessons.ts',
  'travelLessons.ts',
  'jobLessons.ts',
  'pronunciationLessons.ts',
];

function extractQuoted(block: string, key: string): string | undefined {
  for (const quote of ["'", '"'] as const) {
    const re = new RegExp(`${key}:\\s*${quote}((?:\\\\${quote}|[^${quote}])*)${quote}`);
    const m = block.match(re);
    if (m) return m[1].replace(new RegExp(`\\\\${quote}`, 'g'), quote);
  }
  return undefined;
}

function firstKeyword(block: string): string | undefined {
  const m = block.match(/keywords:\s*\[([^\]]+)\]/);
  if (!m) return undefined;
  const first = m[1].match(/'([^']+)'|"([^"]+)"/);
  return first?.[1] ?? first?.[2];
}

function buildPatternTr(keyword: string | undefined, focusSkill: string): string {
  if (!keyword) return `"${focusSkill}" odağında ritmi kopyala`;
  if (keyword.includes(' ')) return `"${keyword}" kalıbını ezberle ve tekrar kullan`;
  return `"${keyword}" üzerinde hafif vurgu yap`;
}

function buildStressTr(block: string, keyword: string | undefined): string {
  const tip = extractQuoted(block, 'pronunciationTipTr');
  if (tip) {
    const cleaned = tip.split(';')[0].trim();
    if (cleaned.length > 10 && cleaned.length < 90) return cleaned;
  }
  if (keyword) return `"${keyword}" üzerinde hafif vurgu yap`;
  return 'Anlam grupları halinde akıcı söyle';
}

function escapeSingleQuotes(s: string): string {
  return s.replace(/'/g, "\\'");
}

function transformFile(filePath: string): number {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes("from './coachCopy'")) {
    content = content.replace(
      /(import \{ createLesson, linkLessonChain \} from '\.\.\/lessonFactory';)/,
      "$1\nimport { buildShadowingCoach } from './coachCopy';",
    );
  }

  const segmentStarts: number[] = [];
  const idRe = /id: '([^']+-s\d+)'/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(content)) !== null) {
    segmentStarts.push(m.index);
  }

  let changed = 0;
  for (let i = 0; i < segmentStarts.length; i++) {
    const start = segmentStarts[i];
    const end = i + 1 < segmentStarts.length ? segmentStarts[i + 1] : content.length;
    let block = content.slice(start, end);

    if (block.includes('buildShadowingCoach(')) continue;
    if (!block.includes("shadowingInstructionTr: '")) continue;

    const rhythm =
      extractQuoted(block, 'pauseMarkedText') ?? extractQuoted(block, 'slowPracticeText');
    const focusSkill = extractQuoted(block, 'focusSkill') ?? 'Shadowing';
    const keyword = firstKeyword(block);
    if (!rhythm) continue;

    const replacement = `shadowingInstructionTr: buildShadowingCoach({
        rhythm: '${escapeSingleQuotes(rhythm)}',
        patternTr: '${escapeSingleQuotes(buildPatternTr(keyword, focusSkill))}',
        stressTr: '${escapeSingleQuotes(buildStressTr(block, keyword))}',
        skill: '${escapeSingleQuotes(focusSkill)}',
      }),`;

    const newBlock = block.replace(/shadowingInstructionTr:\s*'(?:\\'|[^'])*',/, replacement);
    if (newBlock !== block) {
      content = content.slice(0, start) + newBlock + content.slice(end);
      changed++;
      // Re-scan after mutation
      return changed + transformFile(filePath);
    }
  }

  fs.writeFileSync(filePath, content);
  return changed;
}

for (const file of PACK_FILES) {
  const fp = path.join(ROOT, file);
  let total = 0;
  for (let pass = 0; pass < 50; pass++) {
    const n = transformFile(fp);
    total += n;
    if (n === 0) break;
  }
  console.log(`${file}: ${total} additional segments converted`);
}
