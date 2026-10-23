// Every page's `appliesTo` against the pinned release: warn at 1 release behind, fail at 3.
// Also counts coverage (complete / partial / stub) and screenshots' `capturedWith`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import YAML from 'yaml';
import { ENGINE, STALENESS } from '../wiki.config.mjs';

const DOCS = 'src/content/docs';
const releases = JSON.parse(readFileSync('src/data/releases.json', 'utf8'))
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .map((r) => r.version);
const currentIndex = releases.indexOf(ENGINE.version);
if (currentIndex < 0) {
  console.error(`staleness: pinned engine ${ENGINE.version} is not in src/data/releases.json`);
  process.exit(1);
}

function* pages(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* pages(p);
    else if (/\.(md|mdx)$/.test(f)) yield p;
  }
}
function frontmatter(file) {
  const text = readFileSync(file, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  return { fm: YAML.parse(m[1]), body: text.slice(m[0].length) };
}

const counts = { complete: 0, partial: 0, stub: 0 };
const warnings = [];
const failures = [];
let total = 0;
for (const file of pages(DOCS)) {
  const parsed = frontmatter(file);
  const rel = relative(DOCS, file);
  if (!parsed) {
    failures.push(`${rel}: no frontmatter`);
    continue;
  }
  const { fm, body } = parsed;
  total++;
  counts[fm.status] = (counts[fm.status] ?? 0) + 1;
  const i = releases.indexOf(String(fm.appliesTo));
  if (i < 0) {
    failures.push(`${rel}: appliesTo ${fm.appliesTo} is not a known release`);
    continue;
  }
  const behind = i - currentIndex;
  if (behind >= STALENESS.failAfter) failures.push(`${rel}: ${behind} releases behind (appliesTo ${fm.appliesTo})`);
  else if (behind >= STALENESS.warnAfter) warnings.push(`${rel}: ${behind} release(s) behind (appliesTo ${fm.appliesTo})`);
  for (const m of body.matchAll(/capturedWith="(\d+\.\d+\.\d+)"/g)) {
    const j = releases.indexOf(m[1]);
    const b = j < 0 ? Infinity : j - currentIndex;
    if (b >= STALENESS.failAfter) failures.push(`${rel}: a screenshot captured with ${m[1]} is ${b} releases behind`);
    else if (b >= STALENESS.warnAfter) warnings.push(`${rel}: a screenshot captured with ${m[1]} is ${b} release(s) behind`);
  }
}

console.log(`staleness: ${total} page(s) against Musa CAD ${ENGINE.version} — complete ${counts.complete}, partial ${counts.partial}, stub ${counts.stub}`);
for (const w of warnings) console.warn('  warn  ' + w);
for (const f of failures) console.error('  FAIL  ' + f);
if (failures.length) process.exit(1);
