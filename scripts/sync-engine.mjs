// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Bring the wiki's generated data up to date with a Musa CAD build.
//
//   node scripts/sync-engine.mjs [--engine <musacad binary>] [--src <MusaCAD git checkout>]
//
// Writes, all of them generated (never edit by hand):
//   src/data/wiki-data.json       what `musacad --dump-wiki-data` reports: commands, ribbon, keys
//   src/data/command-origins.json the first release each command appeared in, from the git tags
//   src/data/format-history.json  the .musa format's versions, from the comments in the source
//
// --engine defaults to the pinned release (wiki.config.mjs); --src to ../musa_cad. Then run
// scripts/generate-reference.mjs to refresh the pages that are made from this data.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureEngine, headlessEnv } from './lib/engine.mjs';
import { compareVersions } from '../wiki.config.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const SRC = resolve(opt('--src') ?? '../musa_cad');
const releases = JSON.parse(readFileSync('src/data/releases.json', 'utf8'));
const byDate = [...releases].sort((a, b) => compareVersions(a.version, b.version)); // oldest first (two releases can share a date)

// ---- 1. The export ---------------------------------------------------------------------
let enginePath = opt('--engine');
let engineLabel;
if (enginePath) {
  enginePath = resolve(enginePath);
  engineLabel = enginePath;
} else {
  const e = await ensureEngine();
  enginePath = resolve(`.cache/engine/${e.version}/squashfs-root/AppRun`);
  engineLabel = `the v${e.version} release AppImage`;
}
const run = spawnSync(enginePath, ['--dump-wiki-data', '-'], { env: headlessEnv(), encoding: 'utf8', maxBuffer: 64 << 20 });
if (run.status !== 0) {
  console.error(`sync: ${engineLabel} --dump-wiki-data failed (exit ${run.status}).`);
  console.error(run.stderr || run.stdout);
  console.error('This needs a Musa CAD build with --dump-wiki-data (MusaCAD/MusaCAD#84); pass one with --engine.');
  process.exit(1);
}
const data = JSON.parse(run.stdout);
let describe = '';
if (existsSync(`${SRC}/.git`)) {
  try {
    describe = execFileSync('git', ['-C', SRC, 'describe', '--tags', '--always', '--dirty'], { encoding: 'utf8' }).trim();
  } catch {}
}
data.generatedFrom = { engine: engineLabel.replace(process.env.HOME ?? '\u0000', '~'), reports: data.cli?.version, source: describe };
writeFileSync('src/data/wiki-data.json', JSON.stringify(data, null, 2) + '\n');
console.log(`sync: ${data.commands.length} commands from ${data.cli?.version} (${describe || engineLabel})`);

// ---- 2. Where each command first appeared -----------------------------------------------
if (!existsSync(`${SRC}/.git`)) {
  console.error(`sync: no git checkout at ${SRC}; pass --src to compute command origins and format history`);
  process.exit(1);
}
const show = (tag, path) => {
  try {
    return execFileSync('git', ['-C', SRC, 'show', `${tag}:${path}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
  } catch {
    return '';
  }
};
/** Every alias registered at a tag: reg({...}), file_cmd({...}), var("..."), and the DIM variables. */
function aliasesAt(tag) {
  const reg = show(tag, 'src/command/command_registry.cpp');
  const set = new Set();
  for (const m of reg.matchAll(/(?:reg|file_cmd)\(\{([^}]*)\}/g)) {
    for (const a of m[1].matchAll(/"([^"]+)"/g)) set.add(a[1].toUpperCase());
  }
  for (const m of reg.matchAll(/\bvar\("([A-Z0-9]+)"/g)) set.add(m[1]);
  if (/core::kDimVars/.test(reg)) {
    const dim = show(tag, 'include/musacad/core/dimension.hpp');
    const block = /kDimVars\[\]\s*=\s*\{([^}]*)\}/.exec(dim);
    if (block) for (const a of block[1].matchAll(/"([^"]+)"/g)) set.add(a[1]);
  }
  return set;
}
const perTag = byDate.map((r) => ({ version: r.version, aliases: aliasesAt(r.tag) }));
const origins = {};
for (const c of data.commands) {
  const names = [c.name, ...c.aliases].map((a) => a.toUpperCase());
  const first = perTag.find((t) => names.some((n) => t.aliases.has(n)));
  origins[c.name] = first ? first.version : null;
}
writeFileSync('src/data/command-origins.json', JSON.stringify(origins, null, 2) + '\n');
const unknown = Object.values(origins).filter((v) => v === null).length;
console.log(`sync: origins for ${Object.keys(origins).length} commands${unknown ? `, ${unknown} newer than the newest tag` : ''}`);

// ---- 3. The .musa format's history -------------------------------------------------------
const pinned = byDate.findLast((r) => r.formatVersion === data.formatVersion) ?? byDate.at(-1);
const doc = show(pinned.tag, 'include/musacad/core/io/document.hpp') || readFileSync(`${SRC}/include/musacad/core/io/document.hpp`, 'utf8');
const fmt = show(pinned.tag, 'src/core/io/native_format.cpp') || readFileSync(`${SRC}/src/core/io/native_format.cpp`, 'utf8');
const notes = new Map();
const add = (v, text) => {
  const t = text.replace(/\s+/g, ' ').trim().replace(/[.;,]$/, '');
  if (!t) return;
  if (!notes.has(v)) notes.set(v, []);
  if (!notes.get(v).some((x) => x === t)) notes.get(v).push(t);
};
// The block of /// comments above kFormatVersion: "v1: geometry only. v2: layer table ..."
const blockMatch = /((?:^\/\/\/[^\n]*\n)+)inline constexpr std::uint32_t kFormatVersion/m.exec(doc);
if (blockMatch) {
  const text = blockMatch[1].replace(/^\/\/\/ ?/gm, '').replace(/\n/g, ' ');
  for (const m of text.matchAll(/\bv(\d+):\s*(.*?)(?=\s\bv\d+:|$)/g)) add(Number(m[1]), m[2]);
}
// The // vNN: comments where each record is written or read.
for (const m of fmt.matchAll(/\/\/ v(\d+): ([^\n]*)/g)) add(Number(m[1]), m[2]);
const history = [];
for (let v = 1; v <= data.formatVersion; v++) {
  const firstRelease = byDate.find((r) => r.formatVersion >= v);
  history.push({ version: v, release: firstRelease ? firstRelease.version : null, notes: notes.get(v) ?? [] });
}
writeFileSync('src/data/format-history.json', JSON.stringify({ current: data.formatVersion, from: pinned.tag, history }, null, 2) + '\n');
console.log(`sync: format history v1..v${data.formatVersion} (${history.filter((h) => h.notes.length).length} with notes) from ${pinned.tag}`);
