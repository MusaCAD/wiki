// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Plot every drawing in examples/ with the pinned engine release and convert the PDF to SVG.
//
//   examples/<id>.musa        the drawing (CC0)
//   examples/<id>.py          or a program that writes it: run as `python3 -I <id>.py <out.musa>`,
//                             so the code a page shows is the code that made the picture
//   examples/<id>.plotargs    optional: the `--plot` options on one line (default: --paper A4
//                             --landscape); lines starting with # are comments
//   public/rendered/<id>.svg  the illustration the pages embed
//   public/examples/<id>.musa the download
//   src/data/rendered.json    the manifest <Figure> reads: engine version, args, size, hash
//
// A drawing that fails to plot fails the build, so a change in Musa CAD that breaks an example is
// caught here, before a reader sees it.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ensureEngine } from './lib/engine.mjs';

const EXAMPLES = 'examples';
const OUT_SVG = 'public/rendered';
const OUT_FILES = 'public/examples';
const MANIFEST = 'src/data/rendered.json';
const WORK = '.cache/render';

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

const engine = await ensureEngine();
mkdirSync(OUT_SVG, { recursive: true });
mkdirSync(OUT_FILES, { recursive: true });
mkdirSync(WORK, { recursive: true });

const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const manifest = {};
// Programs that write drawings run first; their output joins the hand-written drawings.
const generators = existsSync(EXAMPLES) ? readdirSync(EXAMPLES).filter((f) => f.endsWith('.py')).sort() : [];
const generated = new Map();
for (const g of generators) {
  const id = basename(g, '.py');
  const out = join(WORK, `${id}.musa`);
  const r = spawnSync('python3', ['-I', join(EXAMPLES, g), out], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`render: ${g} failed (exit ${r.status}):\n${r.stderr || r.stdout}`);
    process.exit(1);
  }
  generated.set(`${id}.musa`, out);
}
const files = [
  ...(existsSync(EXAMPLES) ? readdirSync(EXAMPLES).filter((f) => f.endsWith('.musa')) : []),
  ...generated.keys(),
].sort();
let rendered = 0;
let failed = 0;

for (const file of files) {
  const id = basename(file, '.musa');
  const src = generated.get(file) ?? join(EXAMPLES, file);
  const argsFile = join(EXAMPLES, `${id}.plotargs`);
  const args = existsSync(argsFile)
    ? readFileSync(argsFile, 'utf8')
        .split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('#'))
        .join(' ')
        .trim()
    : '--paper A4 --landscape';
  const hash = sha(readFileSync(src));
  const svgPath = join(OUT_SVG, `${id}.svg`);
  const prev = previous[id];
  if (prev && prev.engine === engine.version && prev.args === args && prev.hash === hash && existsSync(svgPath)) {
    manifest[id] = prev;
    copyFileSync(src, join(OUT_FILES, file));
    continue;
  }
  const pdf = join(WORK, `${id}.pdf`);
  const r = engine.run(['--plot', src, pdf, ...args.split(/\s+/)]);
  if (r.status !== 0) {
    failed++;
    console.error(`render: ${file} failed (exit ${r.status}):\n${r.stderr || r.stdout}`);
    continue;
  }
  const c = spawnSync('pdftocairo', ['-svg', pdf, svgPath], { encoding: 'utf8' });
  if (c.status !== 0) {
    failed++;
    console.error(`render: pdftocairo failed for ${file}: ${c.stderr}`);
    continue;
  }
  const head = readFileSync(svgPath, 'utf8').slice(0, 600);
  const w = /width="([\d.]+)(?:pt)?"/.exec(head);
  const h = /height="([\d.]+)(?:pt)?"/.exec(head);
  if (!w || !h) {
    failed++;
    console.error(`render: could not read the size of ${svgPath}`);
    continue;
  }
  copyFileSync(src, join(OUT_FILES, file));
  manifest[id] = {
    file,
    engine: engine.version,
    args,
    hash,
    width: Math.round(Number(w[1])),
    height: Math.round(Number(h[1])),
    status: (r.stdout || '').trim(),
  };
  rendered++;
  console.log(`render: ${file} → ${svgPath} (${(r.stdout || '').trim()})`);
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`render: ${files.length} example(s), ${rendered} rendered now, ${failed} failed, engine ${engine.version}`);
if (failed > 0) process.exit(1);
