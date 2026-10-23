// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Automation may write generated pages and draft assisted ones; it may not change a page a
// person wrote (tier: human). Run on pull requests:
//
//   node scripts/check-tiers.mjs --base origin/main --branch <head branch name>
//
// A pull request counts as automated when its branch starts with sync/, or one of its commits
// says "Wiki-Sync: automated". For those, every changed page that was tier human in the base
// fails the check.
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const base = opt('--base') ?? 'origin/main';
const branch = opt('--branch') ?? '';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });

const range = `${base}...HEAD`;
const messages = git('log', '--format=%B', range);
const automated = branch.startsWith('sync/') || /^Wiki-Sync: automated$/m.test(messages);
if (!automated) {
  console.log('tiers: written by people; nothing to check');
  process.exit(0);
}
const changed = git('diff', '--name-only', range).split('\n').filter((f) => /^src\/content\/docs\/.*\.mdx?$/.test(f));
const problems = [];
for (const f of changed) {
  let text;
  try {
    text = git('show', `${base}:${f}`);
  } catch {
    continue; // a new page
  }
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const fm = m ? YAML.parse(m[1]) ?? {} : {};
  if (fm.tier === 'human') problems.push(f);
}
console.log(`tiers: automated change, ${changed.length} page(s) touched`);
if (problems.length) {
  console.error('tiers: an automated change may not edit pages written by people (tier: human):');
  for (const p of problems) console.error('  ' + p);
  console.error('Flag them in the pull request instead; a person updates them.');
  process.exit(1);
}
