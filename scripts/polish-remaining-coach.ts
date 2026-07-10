import fs from 'fs';
import path from 'path';

const files = ['jobLessons.ts', 'pronunciationLessons.ts'];
const ROOT = path.join(process.cwd(), 'src/data/content/catalog');

function extractQuoted(block: string, key: string): string | undefined {
  for (const quote of ["'", '"'] as const) {
    const re = new RegExp(`${key}:\\s*${quote}((?:\\\\${quote}|[^${quote}])*)${quote}`);
    const m = block.match(re);
    if (m) return m[1].replace(new RegExp(`\\\\${quote}`, 'g'), quote);
  }
}

function firstKeyword(block: string): string | undefined {
  const m = block.match(/keywords:\s*\[([^\]]+)\]/);
  const first = m?.[1].match(/'([^']+)'|"([^"]+)"/);
  return first?.[1] ?? first?.[2];
}

function esc(s: string) {
  return s.replace(/'/g, "\\'");
}

for (const file of files) {
  const fp = path.join(ROOT, file);
  let content = fs.readFileSync(fp, 'utf8');
  if (!content.includes("from './coachCopy'")) {
    content = content.replace(
      /(import \{ createLesson, linkLessonChain \} from '\.\.\/lessonFactory';)/,
      "$1\nimport { buildShadowingCoach } from './coachCopy';",
    );
  }

  let changed = 0;
  while (content.includes("shadowingInstructionTr: '")) {
    const idx = content.indexOf("shadowingInstructionTr: '");
    const segStart = content.lastIndexOf("id: '", idx);
    const segEnd = content.indexOf("id: '", idx + 1);
    const block = content.slice(segStart, segEnd === -1 ? content.length : segEnd);
    if (block.includes('buildShadowingCoach(')) break;

    const rhythm =
      extractQuoted(block, 'pauseMarkedText') ?? extractQuoted(block, 'slowPracticeText');
    const focusSkill = extractQuoted(block, 'focusSkill') ?? 'Shadowing';
    const keyword = firstKeyword(block);
    if (!rhythm) break;

    const patternTr = keyword?.includes(' ')
      ? `"${keyword}" kalıbını ezberle ve tekrar kullan`
      : keyword
        ? `"${keyword}" üzerinde hafif vurgu yap`
        : `"${focusSkill}" odağında ritmi kopyala`;
    const tip = extractQuoted(block, 'pronunciationTipTr');
    const stressTr =
      tip && tip.length < 90 ? tip.split(';')[0].trim() : patternTr;

    const replacement = `shadowingInstructionTr: buildShadowingCoach({
        rhythm: '${esc(rhythm)}',
        patternTr: '${esc(patternTr)}',
        stressTr: '${esc(stressTr)}',
        skill: '${esc(focusSkill)}',
      }),`;

    const old = block.match(/shadowingInstructionTr:\s*'(?:\\'|[^'])*',/)?.[0];
    if (!old) break;
    const newBlock = block.replace(old, replacement);
    content = content.slice(0, segStart) + newBlock + content.slice(segEnd === -1 ? content.length : segEnd);
    changed++;
  }

  fs.writeFileSync(fp, content);
  console.log(`${file}: ${changed} converted`);
}
