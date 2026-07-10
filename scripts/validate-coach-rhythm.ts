/** Validate buildShadowingCoach rhythm matches segment pauseMarkedText */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src/data/content/catalog');
const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('Lessons.ts'));

for (const file of files) {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const segRe = /id: '([^']+-s\d+)'[\s\S]*?pauseMarkedText:\s*'([^']+)'[\s\S]*?buildShadowingCoach\(\{[\s\S]*?rhythm:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = segRe.exec(content)) !== null) {
    const [, segId, pause, rhythm] = m;
    if (pause !== rhythm) {
      console.log(`MISMATCH ${file} ${segId}`);
      console.log(`  pause:   ${pause}`);
      console.log(`  rhythm:  ${rhythm}`);
    }
  }
}
