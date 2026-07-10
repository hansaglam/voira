import fs from 'fs';
import path from 'path';

const fp = path.join(process.cwd(), 'src/data/content/catalog/dailyBeginnerPackLessons.ts');
let c = fs.readFileSync(fp, 'utf8');

if (!c.includes("from './coachCopy'")) {
  c = c.replace(
    /(import \{ createLesson[^;]+;)/,
    "$1\nimport { buildShadowingCoach } from './coachCopy';",
  );
}

function extractQuoted(block: string, key: string): string | undefined {
  for (const q of ["'", '"'] as const) {
    const re = new RegExp(`${key}:\\s*${q}((?:\\\\${q}|[^${q}])*)${q}`);
    const m = block.match(re);
    if (m) return m[1].replace(new RegExp(`\\\\${q}`, 'g'), q);
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

let total = 0;
for (let pass = 0; pass < 20; pass++) {
  const idx = c.indexOf("shadowingInstructionTr: '");
  if (idx === -1) break;

  const segStart = c.lastIndexOf("id: '", idx);
  const segEnd = c.indexOf("id: '", idx + 1);
  const block = c.slice(segStart, segEnd === -1 ? c.length : segEnd);
  const rhythm =
    extractQuoted(block, 'pauseMarkedText') ?? extractQuoted(block, 'slowPracticeText');
  const focusSkill = extractQuoted(block, 'focusSkill') ?? 'Shadowing';
  const keyword = firstKeyword(block);
  if (!rhythm) break;

  const patternTr = keyword?.includes(' ')
    ? `"${keyword}" kalıbını ezberle ve tekrar kullan`
    : keyword
      ? `"${keyword}" üzerinde hafif vurgu yap`
      : `${focusSkill} odağında ritmi kopyala`;
  const tip = extractQuoted(block, 'pronunciationTipTr');
  const stressTr = tip && tip.length < 90 ? tip.split(';')[0].trim() : patternTr;

  const replacement = `shadowingInstructionTr: buildShadowingCoach({
        rhythm: '${esc(rhythm)}',
        patternTr: '${esc(patternTr)}',
        stressTr: '${esc(stressTr)}',
        skill: '${esc(focusSkill)}',
      }),`;

  const old = block.match(/shadowingInstructionTr:\s*'(?:\\'|[^'])*',/)?.[0];
  if (!old) break;
  c = c.slice(0, segStart) + block.replace(old, replacement) + c.slice(segEnd === -1 ? c.length : segEnd);
  total++;
}

fs.writeFileSync(fp, c);
console.log(`dailyBeginnerPackLessons: ${total} converted`);
