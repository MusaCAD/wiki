// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Make sure every command and every system variable has a page.
//
//   node scripts/generate-reference.mjs
//
// For each item in src/data/wiki-data.json:
//   - no page yet                -> write a stub (tier: generated, status: not written yet);
//   - a page with tier generated -> rewrite it, so it follows the current data;
//   - a page someone has written (tier assisted or human) -> leave it alone.
// Generated pages for items that no longer exist are removed; written pages for them are left
// for scripts/check-pages.mjs to report, because a person should decide what happens to them.
//
// The facts at the top of each page (aliases, ribbon, first prompt, default) are not written
// into the file: the page draws them from the data when the site is built.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { slugOf, isSysvar } from '../src/lib/reference.mjs';

const data = JSON.parse(readFileSync('src/data/wiki-data.json', 'utf8'));
const releases = JSON.parse(readFileSync('src/data/releases.json', 'utf8'));
const release = releases.find((r) => r.version === data.version);
if (!release) {
  console.error(`generate: Musa CAD ${data.version} is not in src/data/releases.json; add it first`);
  process.exit(1);
}
const DIRS = { command: 'src/content/docs/reference/commands', sysvar: 'src/content/docs/reference/system-variables' };
for (const d of Object.values(DIRS)) mkdirSync(d, { recursive: true });

const frontmatterOf = (file) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, 'utf8'));
  return m ? YAML.parse(m[1]) ?? {} : {};
};

function stub(c, kind) {
  const aliases = c.aliases.filter((a) => a !== c.name);
  const what = kind === 'sysvar' ? 'system variable' : 'command';
  const lead = aliases.length ? `${c.name} (${aliases.join(', ')})` : c.name;
  const what_it_does = c.description.replace(/\s+/g, ' ').trim().replace(/\.?$/, '.');
  const more =
    kind === 'sysvar'
      ? 'What it controls, the value it starts with, and how to change it.'
      : 'How to start it, where it is on the ribbon, and what it asks first.';
  const description = `The ${lead} ${what} in Musa CAD: ${what_it_does} ${more}`;
  return [
    '---',
    '# SPDX-License-Identifier: LGPL-3.0-or-later',
    '# Copyright (C) 2026 Pranay Kiran',
    '# Made by scripts/generate-reference.mjs from src/data/wiki-data.json; it is rewritten at every',
    '# sync. To write this page, set tier to assisted (or human), set status, and write below.',
    `title: ${JSON.stringify(c.name)}`,
    `description: ${JSON.stringify(description)}`,
    'tier: generated',
    `appliesTo: ${data.version}`,
    `lastVerified: ${release.date}`,
    'status: stub',
    `kind: ${kind}`,
    `${kind === 'sysvar' ? 'sysvar' : 'command'}: ${JSON.stringify(c.name)}`,
    'tableOfContents: false',
    '---',
    '',
  ].join('\n');
}

const wanted = new Map(); // path -> { c, kind }
for (const c of data.commands) {
  const kind = isSysvar(c) ? 'sysvar' : 'command';
  wanted.set(join(DIRS[kind], `${slugOf(c.name)}.mdx`), { c, kind });
}

let created = 0;
let refreshed = 0;
let kept = 0;
for (const [path, { c, kind }] of wanted) {
  if (existsSync(path)) {
    const fm = frontmatterOf(path);
    if (fm.tier !== 'generated') {
      kept++;
      continue;
    }
    const next = stub(c, kind);
    if (readFileSync(path, 'utf8') !== next) {
      writeFileSync(path, next);
      refreshed++;
    }
    continue;
  }
  writeFileSync(path, stub(c, kind));
  created++;
}

let removed = 0;
for (const dir of Object.values(DIRS)) {
  for (const f of readdirSync(dir)) {
    const path = join(dir, f);
    if (!f.endsWith('.mdx') || f === 'index.mdx' || wanted.has(path)) continue;
    if (frontmatterOf(path).tier === 'generated') {
      unlinkSync(path);
      removed++;
    }
  }
}
const sysvars = [...wanted.values()].filter((w) => w.kind === 'sysvar').length;
console.log(
  `generate: ${wanted.size - sysvars} commands and ${sysvars} system variables; ` +
    `${created} new stub(s), ${refreshed} refreshed, ${kept} written page(s) left alone, ${removed} removed`
);
