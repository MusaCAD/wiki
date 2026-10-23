// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Two promises the wiki makes, checked on every build:
//   1. Every page says who wrote it (tier), which release it was checked against (appliesTo),
//      when (lastVerified), and how complete it is (status).
//   2. Every command and system variable Musa CAD has has a page, and no page describes one
//      that no longer exists.
// Prints the coverage: how many command and variable pages are written.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import YAML from 'yaml';
import { isSysvar } from '../src/lib/reference.mjs';

const DOCS = 'src/content/docs';
const data = JSON.parse(readFileSync('src/data/wiki-data.json', 'utf8'));
const REQUIRED = ['title', 'description', 'tier', 'appliesTo', 'lastVerified', 'status'];

function* pages(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* pages(p);
    else if (/\.(md|mdx)$/.test(f)) yield p;
  }
}

const problems = [];
const commandPages = new Map();
const sysvarPages = new Map();
let total = 0;
for (const file of pages(DOCS)) {
  const rel = relative(DOCS, file);
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, 'utf8'));
  if (!m) {
    problems.push(`${rel}: no frontmatter`);
    continue;
  }
  const fm = YAML.parse(m[1]) ?? {};
  total++;
  for (const k of REQUIRED) if (fm[k] === undefined || fm[k] === '') problems.push(`${rel}: missing ${k}`);
  if (typeof fm.description === 'string' && fm.description.trim().length < 50) problems.push(`${rel}: the description is too short to help search results (write a full sentence)`);
  if (fm.kind === 'command') {
    if (!fm.command) problems.push(`${rel}: kind command without command:`);
    else commandPages.set(fm.command, { rel, status: fm.status });
  }
  if (fm.kind === 'sysvar') {
    if (!fm.sysvar) problems.push(`${rel}: kind sysvar without sysvar:`);
    else sysvarPages.set(fm.sysvar, { rel, status: fm.status });
  }
  if (fm.kind === 'blog' && !fm.date) problems.push(`${rel}: a blog post needs a date`);
}

const names = { command: new Set(), sysvar: new Set() };
for (const c of data.commands) names[isSysvar(c) ? 'sysvar' : 'command'].add(c.name);
for (const n of names.command) if (!commandPages.has(n)) problems.push(`command ${n} has no page (run node scripts/generate-reference.mjs)`);
for (const n of names.sysvar) if (!sysvarPages.has(n)) problems.push(`system variable ${n} has no page (run node scripts/generate-reference.mjs)`);
for (const [n, p] of commandPages) if (!names.command.has(n)) problems.push(`${p.rel}: describes ${n}, which Musa CAD ${data.version} does not have as a command`);
for (const [n, p] of sysvarPages) if (!names.sysvar.has(n)) problems.push(`${p.rel}: describes ${n}, which Musa CAD ${data.version} does not have as a system variable`);

const tally = (map) => {
  const t = { complete: 0, partial: 0, stub: 0 };
  for (const { status } of map.values()) t[status] = (t[status] ?? 0) + 1;
  return t;
};
const tc = tally(commandPages);
const tv = tally(sysvarPages);
console.log(`pages: ${total} page(s) checked`);
console.log(`coverage: commands ${names.command.size} — complete ${tc.complete}, partial ${tc.partial}, not written yet ${tc.stub}`);
console.log(`coverage: system variables ${names.sysvar.size} — complete ${tv.complete}, partial ${tv.partial}, not written yet ${tv.stub}`);
if (problems.length) {
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
