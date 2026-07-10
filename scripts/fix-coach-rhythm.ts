/** Fix buildShadowingCoach rhythm to match pauseMarkedText/slowPracticeText per segment. */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src/data/content/catalog');
const files = [
  'cafeLessons.ts',
  'travelLessons.ts',
  'jobLessons.ts',
  'pronunciationLessons.ts',
  'dailyBeginnerPackLessons.ts',
];

function extractQuoted(block: string, key: string): string | undefined {
  for (const q of ["'", '"'] as const) {
    const re = new RegExp(`${key}:\\s*${q}((?:\\\\${q}|[^${q}])*)${q}`);
    const m = block.match(re);
    if (m) return m[1].replace(new RegExp(`\\\\${q}`, 'g'), q);
  }
}

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

for (const file of files) {
  const fp = path.join(ROOT, file);
  let content = fs.readFileSync(fp, 'utf8');
  const segIds: number[] = [];
  const re = /id: '([^']+-s\d+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) segIds.push(m.index);

  let fixed = 0;
  for (let i = 0; i < segIds.length; i++) {
    const start = segIds[i];
    const end = i + 1 < segIds.length ? segIds[i + 1] : content.length;
    const block = content.slice(start, end);
    if (!block.includes('buildShadowingCoach(')) continue;

    const rhythm =
      extractQuoted(block, 'pauseMarkedText') ?? extractQuoted(block, 'slowPracticeText');
    if (!rhythm) continue;

    const coachMatch = block.match(
      /shadowingInstructionTr: buildShadowingCoach\(\{([\s\S]*?)\}\),/,
    );
    if (!coachMatch) continue;

    const currentRhythm = coachMatch[1].match(/rhythm:\s*'((?:\\'|[^'])*)'/)?.[1]?.replace(/\\'/g, "'");
    if (currentRhythm === rhythm) continue;

    const newCoach = coachMatch[0].replace(
      /rhythm:\s*'(?:\\'|[^'])*'/,
      `rhythm: '${esc(rhythm)}'`,
    );
    const newBlock = block.replace(coachMatch[0], newCoach);
    content = content.slice(0, start) + newBlock + content.slice(end);
    fixed++;

    // Re-index after mutation
    const fresh = fs.readFileSync(fp, 'utf8');
    if (fresh !== content) {
      fs.writeFileSync(fp, content);
    }
    // Restart scan for this file
    break;
  }

  if (fixed > 0) {
    // loop until no fixes
    const again = transformFileLoop(fp);
    console.log(`${file}: ${again} rhythm fixes`);
  } else {
    console.log(`${file}: 0 rhythm fixes`);
  }
}

function transformFileLoop(fp: string): number {
  let total = 0;
  for (let pass = 0; pass < 100; pass++) {
    let content = fs.readFileSync(fp, 'utf8');
    const segIds: number[] = [];
    const re = /id: '([^']+-s\d+)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) segIds.push(m.index);

    let fixedThisPass = 0;
    for (let i = 0; i < segIds.length; i++) {
      const start = segIds[i];
      const end = i + 1 < segIds.length ? segIds[i + 1] : content.length;
      const block = content.slice(start, end);
      if (!block.includes('buildShadowingCoach(')) continue;

      const rhythm =
        extractQuoted(block, 'pauseMarkedText') ?? extractQuoted(block, 'slowPracticeText');
      if (!rhythm) continue;

      const coachMatch = block.match(
        /shadowingInstructionTr: buildShadowingCoach\(\{([\s\S]*?)\}\),/,
      );
      if (!coachMatch) continue;

      const currentRhythm = coachMatch[1]
        .match(/rhythm:\s*'((?:\\'|[^'])*)'/)?.[1]
        ?.replace(/\\'/g, "'");
      if (currentRhythm === rhythm) continue;

      const newCoach = coachMatch[0].replace(
        /rhythm:\s*'(?:\\'|[^'])*'/,
        `rhythm: '${esc(rhythm)}'`,
      );
      content = content.slice(0, start) + block.replace(coachMatch[0], newCoach) + content.slice(end);
      fs.writeFileSync(fp, content);
      fixedThisPass++;
      total++;
      break;
    }
    if (fixedThisPass === 0) break;
  }
  return total;
}

// Run loop for all files
for (const file of files) {
  const n = transformFileLoop(path.join(ROOT, file));
  console.log(`${file}: ${n} rhythm fixes total`);
}
