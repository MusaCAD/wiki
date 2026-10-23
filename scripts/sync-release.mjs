// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Bring the wiki up to a Musa CAD release.
//
//   node scripts/sync-release.mjs [--tag v0.9.0] [--engine <musacad binary>] [--src <MusaCAD checkout>]
//
// 1. Reads the release from GitHub (the newest one when --tag is left out) and records it in
//    src/data/releases.json; points wiki.config.mjs at it.
// 2. Runs scripts/sync-engine.mjs with that release's AppImage (or --engine), then
//    scripts/generate-reference.mjs.
// 3. Writes .cache/sync-report.md: what changed in commands, system variables, shortcuts and
//    the file format, and which written pages now need checking. The sync workflow uses it as
//    the pull request's description.
//
// Exits 0 with "already current" when the wiki is already on that release.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import YAML from 'yaml';
import { ENGINE, SITE_URL, compareVersions } from '../wiki.config.mjs';
import { isSysvar, defaultOf, indexData, locationText, pathOf } from '../src/lib/reference.mjs';

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const REPO = 'MusaCAD/MusaCAD';
const headers = { accept: 'application/vnd.github+json', 'user-agent': 'musacad-wiki-sync' };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function release(tag) {
  const url = tag ? `https://api.github.com/repos/${REPO}/releases/tags/${tag}` : `https://api.github.com/repos/${REPO}/releases/latest`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub: ${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

const rel = await release(opt('--tag'));
const tag = rel.tag_name;
const version = tag.replace(/^v/, '');
const releases = JSON.parse(readFileSync('src/data/releases.json', 'utf8'));
if (compareVersions(version, ENGINE.version) < 0) {
  console.log(`sync: ${tag} is older than the wiki's ${ENGINE.version}; nothing to do`);
  process.exit(0);
}
if (version === ENGINE.version && !args.includes('--force')) {
  console.log(`sync: already current (Musa CAD ${version})`);
  process.exit(0);
}

const before = JSON.parse(readFileSync('src/data/wiki-data.json', 'utf8'));
const beforeVersion = ENGINE.version;

// ---- 1. The release, recorded -----------------------------------------------------------
const kinds = (rel.assets ?? []).map((a) => a.name);
const assets = [
  kinds.some((n) => /\.exe$/i.test(n)) && 'exe',
  kinds.some((n) => /\.appimage$/i.test(n)) && 'appimage',
  kinds.some((n) => /\.flatpak$/i.test(n)) && 'flatpak',
  kinds.some((n) => /\.dmg$/i.test(n)) && 'dmg',
].filter(Boolean);
// The first plain paragraph of the release notes, as a one-line summary (a person edits it in review).
const summary =
  (rel.body ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('>'))
    ?.replace(/\*\*/g, '')
    .replace(/\s+/g, ' ') ?? `Musa CAD ${version}.`;
const entry = {
  id: version,
  version,
  tag,
  date: (rel.published_at ?? new Date().toISOString()).slice(0, 10),
  formatVersion: before.formatVersion, // corrected from the engine's own report below
  assets,
  ...(assets.includes('exe') ? {} : { windowsInstallerPending: true }),
  summary,
};
const others = releases.filter((r) => r.version !== version);
const list = [entry, ...others].sort((a, b) => compareVersions(b.version, a.version));
writeFileSync('src/data/releases.json', JSON.stringify(list, null, 2) + '\n');
const cfg = readFileSync('wiki.config.mjs', 'utf8')
  .replace(/version: '\d+\.\d+\.\d+'/, `version: '${version}'`)
  .replace(/tag: 'v\d+\.\d+\.\d+'/, `tag: '${tag}'`);
writeFileSync('wiki.config.mjs', cfg);

// ---- 2. The data and the pages ----------------------------------------------------------
const run = (script, extra = []) => {
  const r = spawnSync(process.execPath, [script, ...extra], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const syncArgs = [];
if (opt('--engine')) syncArgs.push('--engine', opt('--engine'));
if (opt('--src')) syncArgs.push('--src', opt('--src'));
run('scripts/sync-engine.mjs', syncArgs);
const after = JSON.parse(readFileSync('src/data/wiki-data.json', 'utf8'));
entry.formatVersion = after.formatVersion;
writeFileSync('src/data/releases.json', JSON.stringify([entry, ...others].sort((a, b) => compareVersions(b.version, a.version)), null, 2) + '\n');
run('scripts/generate-reference.mjs');

// ---- 3. The report ---------------------------------------------------------------------
const mapOf = (d) => new Map(d.commands.map((c) => [c.name, c]));
const b = mapOf(before);
const a = mapOf(after);
const ai = indexData(after);
const bi = indexData(before);
const link = (c) => `[${c.name}](${SITE_URL}${pathOf(c)})`;
const added = [...a.values()].filter((c) => !b.has(c.name));
const removed = [...b.values()].filter((c) => !a.has(c.name));
const changed = [];
for (const c of a.values()) {
  const o = b.get(c.name);
  if (!o) continue;
  const what = [];
  if (o.description !== c.description) what.push('description');
  if (JSON.stringify(o.aliases) !== JSON.stringify(c.aliases)) what.push('aliases');
  if ((o.opening?.prompt ?? '') !== (c.opening?.prompt ?? '')) what.push(isSysvar(c) ? `default ${defaultOf(o)} → ${defaultOf(c)}` : 'first prompt');
  if ((o.opening?.window ?? '') !== (c.opening?.window ?? '')) what.push('window');
  const lb = JSON.stringify((bi.ribbon.get(c.name) ?? []).map(locationText));
  const la = JSON.stringify((ai.ribbon.get(c.name) ?? []).map(locationText));
  if (lb !== la) what.push('ribbon');
  if (isSysvar(o) !== isSysvar(c)) what.push(isSysvar(c) ? 'now a system variable' : 'now a command');
  if (what.length) changed.push({ c, what });
}
const keys = (d) => new Set(d.ui.shortcuts.map((s) => `${s.keys.join(' or ')}: ${s.action}`));
const kb = keys(before);
const ka = keys(after);

// Written pages (assisted or human) that are now behind, and those whose command changed.
function* pages(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* pages(p);
    else if (/\.(md|mdx)$/.test(f)) yield p;
  }
}
const behind = [];
const touched = [];
const changedNames = new Set([...changed.map((x) => x.c.name), ...removed.map((c) => c.name)]);
for (const file of pages('src/content/docs')) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, 'utf8'));
  if (!m) continue;
  const fm = YAML.parse(m[1]) ?? {};
  if (fm.tier === 'generated' || fm.kind === 'blog') continue;
  const rel = relative('src/content/docs', file);
  if (fm.appliesTo && compareVersions(String(fm.appliesTo), version) < 0) behind.push({ rel, tier: fm.tier });
  const name = fm.command ?? fm.sysvar;
  if (name && changedNames.has(name)) touched.push({ rel, tier: fm.tier, name });
}

const lines = [];
lines.push(`## Musa CAD ${version}`, '');
lines.push(`This pull request brings the wiki from ${beforeVersion} to ${version} ([release notes](${rel.html_url})). It was opened by \`scripts/sync-release.mjs\`.`, '');
lines.push(`- Commands and system variables: ${b.size} → ${a.size}`);
lines.push(`- File format: v${before.formatVersion} → v${after.formatVersion}${before.formatVersion !== after.formatVersion ? ' (files saved by ' + version + ' need ' + version + ' or newer)' : ''}`);
lines.push(`- Release assets: ${assets.join(', ') || 'none yet'}${assets.includes('exe') ? '' : ' (the Windows installer is not attached yet)'}`, '');
const section = (title, items) => {
  lines.push(`### ${title} (${items.length})`, '');
  if (!items.length) lines.push('None.');
  else for (const i of items) lines.push(`- ${i}`);
  lines.push('');
};
section('Added', added.map((c) => `${link(c)}${isSysvar(c) ? ' (system variable)' : ''}: ${c.description}`));
section('Removed', removed.map((c) => `\`${c.name}\`: its generated page is removed; check for links to it.`));
section('Changed', changed.map(({ c, what }) => `${link(c)}: ${what.join(', ')}`));
section('Keyboard shortcuts', [...[...ka].filter((k) => !kb.has(k)).map((k) => `added: ${k}`), ...[...kb].filter((k) => !ka.has(k)).map((k) => `removed: ${k}`)]);
section('Written pages about a command that changed', touched.map((t) => `\`${t.rel}\` (${t.tier}): ${t.name}`));
section(`Written pages checked against an older release`, behind.map((p) => `\`${p.rel}\` (${p.tier})`));
lines.push('### Before merging', '');
lines.push('- [ ] The release summary in `src/data/releases.json` reads well.');
lines.push('- [ ] Pages about commands that changed are updated (assisted) or flagged to their author (human).');
lines.push('- [ ] Pages listed as older are checked, and their `appliesTo` and `lastVerified` raised.');
lines.push('- [ ] A blog post for the release, if there should be one.');
lines.push('', 'Generated pages (tier generated) may be merged as they are once CI is green. Written pages need a person.');
mkdirSync('.cache', { recursive: true });
writeFileSync('.cache/sync-report.md', lines.join('\n') + '\n');
console.log(`sync: wiki moved to Musa CAD ${version}; report in .cache/sync-report.md`);
console.log(`sync: ${added.length} added, ${removed.length} removed, ${changed.length} changed, ${touched.length} written page(s) to update, ${behind.length} written page(s) older`);
