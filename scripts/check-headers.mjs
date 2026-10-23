// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Every file that can hold a comment starts with the licence line and the copyright line.
// Files that cannot (JSON, drawings, images, the licence texts, CNAME) are exempt.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, basename } from 'node:path';

const SPDX = 'SPDX-License-Identifier: LGPL-3.0-or-later';
const COPYRIGHT = 'Copyright (C) 2026 Pranay Kiran';
const EXEMPT_EXT = new Set(['.json', '.musa', '.png', '.jpg', '.jpeg', '.webp', '.woff2', '.pdf']);
const EXEMPT = new Set(['COPYING', 'COPYING.LESSER', 'LICENSE', 'public/CNAME', 'package-lock.json']);

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !EXEMPT.has(f) && !EXEMPT_EXT.has(extname(f)) && !f.startsWith('.notes/'));

const missing = [];
for (const f of files) {
  let head;
  try {
    head = readFileSync(f, 'utf8').slice(0, 600);
  } catch {
    continue; // deleted in the working tree
  }
  if (!head.includes(SPDX) || !head.includes(COPYRIGHT)) missing.push(f);
}
console.log(`headers: ${files.length} file(s) checked`);
if (missing.length) {
  console.error(`headers: ${missing.length} file(s) without the licence and copyright lines:`);
  for (const f of missing) console.error('  ' + f + `  (${basename(f)})`);
  process.exit(1);
}
