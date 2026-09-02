/**
 * Emits src/i18n/resources/{tr,en,es,pt,id,ar}.json from TypeScript catalogs.
 * Run: npx tsx scripts/emit-i18n-json.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { enCatalog } from '../src/i18n/catalog.en';
import { trCatalog } from '../src/i18n/catalog.tr';
import { arCatalog, esCatalog, idCatalog, ptCatalog } from '../src/i18n/catalog.localized';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'src', 'i18n', 'resources');
fs.mkdirSync(outDir, { recursive: true });

const packs: Record<string, unknown> = {
  en: enCatalog,
  tr: trCatalog,
  es: esCatalog,
  pt: ptCatalog,
  id: idCatalog,
  ar: arCatalog,
};

for (const [code, catalog] of Object.entries(packs)) {
  const file = path.join(outDir, `${code}.json`);
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log('wrote', file);
}
