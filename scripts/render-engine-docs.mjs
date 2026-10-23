// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Render documents that live in the Musa CAD repository as wiki pages, at build time.
//
//   node scripts/render-engine-docs.mjs [--src <MusaCAD checkout>]
//
// The developers keep these documents next to the code; the wiki shows them as they are at the
// pinned release instead of keeping copies that would drift. They are read from a local
// checkout when one is given (or found at ../musa_cad), otherwise from GitHub at the pinned tag.
// The pages are written under src/content/docs/ and are not committed (see .gitignore).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { ENGINE, compareVersions } from '../wiki.config.mjs';

const args = process.argv.slice(2);
const srcArg = args.includes('--src') ? args[args.indexOf('--src') + 1] : undefined;
const SRC = srcArg ? resolve(srcArg) : existsSync('../musa_cad/.git') ? resolve('../musa_cad') : null;
const TAG = ENGINE.tag;
const CACHE = `.cache/engine-docs/${TAG}`;
const releases = JSON.parse(readFileSync('src/data/releases.json', 'utf8')).sort((a, b) => compareVersions(b.version, a.version));
const pinned = releases.find((r) => r.version === ENGINE.version);

/** The wiki page each repository document is shown as. */
const WIKI_PAGE = {
  'docs/ARCHITECTURE.md': '/developer/architecture/',
  'docs/ROADMAP.md': '/project/roadmap/',
  'docs/THIRD_PARTY_LICENSES.md': '/project/third-party-components/',
  'docs/COMMANDS.md': '/reference/command-status/',
  'docs/AUTOCAD_CONFIG.md': '/reference/autocad-settings-status/',
  'docs/BUILD.md': '/developer/building/',
  'docs/CLI.md': '/scripting/command-line/',
  'docs/RELEASING.md': '/developer/releasing/',
};
for (const r of releases) WIKI_PAGE[`docs/release-notes/${r.tag}.md`] = `/releases/${r.tag.replace(/\./g, '-')}/`;

const DOCS = [
  {
    path: 'docs/ARCHITECTURE.md',
    out: 'developer/architecture.md',
    title: 'Architecture',
    description: "How Musa CAD is built: its modules, its three threads, the geometry store and kernel, the snapshot the renderer draws, and the decisions behind each phase. The developers' own design record.",
    kind: 'developer',
    order: 2,
  },
  {
    path: 'docs/ROADMAP.md',
    out: 'project/roadmap.md',
    title: 'Roadmap',
    description: 'What Musa CAD does not do yet, grouped by theme, with the AutoCAD behaviour each item is measured against, its priority and its GitHub issue.',
    kind: 'project',
    order: 1,
  },
  {
    path: 'docs/THIRD_PARTY_LICENSES.md',
    out: 'project/third-party-components.md',
    title: 'Third-party components',
    description: 'Every library Musa CAD uses, how it uses it, its licence, and the evidence that no GPL or DWG library is linked into Musa CAD.',
    kind: 'project',
    order: 5,
  },
  {
    path: 'docs/COMMANDS.md',
    out: 'reference/command-status.md',
    title: 'Command status table',
    description: "The developers' table of every AutoCAD command Musa CAD implements or plans, with the details of what each one does and what is still missing.",
    kind: 'reference',
    order: 4,
  },
  {
    path: 'docs/AUTOCAD_CONFIG.md',
    out: 'reference/autocad-settings-status.md',
    title: 'AutoCAD settings status',
    description: 'Every AutoCAD setting relevant to 2D drafting, option by option, and whether Musa CAD has it yet: dimension styles, options, drafting settings and more.',
    kind: 'reference',
    order: 5,
  },
  ...releases.map((r, i) => ({
    path: `docs/release-notes/${r.tag}.md`,
    out: `releases/${r.tag.replace(/\./g, '-')}.md`,
    title: `Musa CAD ${r.version}`,
    description: `The release notes for Musa CAD ${r.version} (${r.date}): ${r.summary}`.slice(0, 300),
    kind: 'release',
    order: i + 1,
    release: r.version,
  })),
];

function read(path) {
  const cached = join(CACHE, path);
  if (SRC) {
    try {
      const text = execFileSync('git', ['-C', SRC, 'show', `${TAG}:${path}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
      mkdirSync(dirname(cached), { recursive: true });
      writeFileSync(cached, text);
      return text;
    } catch {
      // the tag is not in this checkout; try GitHub
    }
  }
  if (existsSync(cached)) return readFileSync(cached, 'utf8');
  return null;
}
async function fetchText(path) {
  const local = read(path);
  if (local !== null) return local;
  const url = `https://raw.githubusercontent.com/MusaCAD/MusaCAD/${TAG}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not read ${path} at ${TAG}: ${res.status} ${url}`);
  const text = await res.text();
  mkdirSync(dirname(join(CACHE, path)), { recursive: true });
  writeFileSync(join(CACHE, path), text);
  return text;
}

const ALLOWED_TAGS = new Set(['br', 'sub', 'sup', 'kbd', 'b', 'i', 'em', 'strong', 'code', 'details', 'summary', 'p', 'img', 'a', 'u', 's']);

/** Repository Markdown -> a wiki page body: links resolved, the title line removed, stray tags escaped. */
function transform(md, path) {
  const dir = posix.dirname(path);
  let out = md.replace(/<!--[\s\S]*?-->\n?/g, '').trimStart();
  out = out.replace(/^# .*\n+/, ''); // the page title comes from the frontmatter
  const lines = out.split('\n');
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    if (/^\s*(```|~~~)/.test(l)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    // Escape < that would start an unknown HTML tag, outside inline code.
    l = l
      .split(/(`[^`]*`)/)
      .map((part) => (part.startsWith('`') ? part : part.replace(/<(\/?)([A-Za-z][\w-]*)/g, (m, slash, name) => (ALLOWED_TAGS.has(name.toLowerCase()) ? m : `&lt;${slash}${name}`))))
      .join('');
    // Links and images relative to the document.
    l = l.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (m, bang, text, target, title = '') => {
      if (/^(https?:|mailto:|#)/.test(target)) return m;
      const [p, hash = ''] = target.split('#');
      const full = posix.normalize(posix.join(dir, p));
      const anchor = hash ? `#${hash}` : '';
      if (!bang && WIKI_PAGE[full]) return `[${text}](${WIKI_PAGE[full]}${anchor}${title})`;
      const base = bang ? 'https://raw.githubusercontent.com/MusaCAD/MusaCAD' : 'https://github.com/MusaCAD/MusaCAD/blob';
      return `${bang}[${text}](${base}/${TAG}/${full}${anchor}${title})`;
    });
    // Bare issue references: (#20) -> link.
    l = l.replace(/(^|[\s(,])#(\d{1,4})\b(?![\w-])/g, (m, pre, n) => `${pre}[#${n}](https://github.com/MusaCAD/MusaCAD/issues/${n})`);
    lines[i] = l;
  }
  return lines.join('\n').trim() + '\n';
}

let written = 0;
for (const d of DOCS) {
  let text;
  try {
    text = await fetchText(d.path);
  } catch (e) {
    if (d.kind === 'release') {
      console.warn(`engine-docs: no notes for ${d.release} at ${TAG} (${e.message}); the release page is skipped`);
      continue;
    }
    throw e;
  }
  const fm = [
    '---',
    '# SPDX-License-Identifier: LGPL-3.0-or-later',
    '# Copyright (C) 2026 Pranay Kiran',
    `# Rendered by scripts/render-engine-docs.mjs from ${d.path} at ${TAG}. Do not edit: change the`,
    '# document in the Musa CAD repository.',
    `title: ${JSON.stringify(d.title)}`,
    `description: ${JSON.stringify(d.description)}`,
    'tier: generated',
    `appliesTo: ${ENGINE.version}`,
    `lastVerified: ${pinned?.date ?? new Date().toISOString().slice(0, 10)}`,
    'status: complete',
    `kind: ${d.kind}`,
    `sourceOf: ${JSON.stringify(`MusaCAD/MusaCAD ${d.path} at ${TAG}`)}`,
    `editUrl: ${JSON.stringify(`https://github.com/MusaCAD/MusaCAD/edit/main/${d.path}`)}`,
    ...(d.release ? [`release: ${JSON.stringify(d.release)}`] : []),
    'sidebar:',
    `  order: ${d.order}`,
    '---',
    '',
  ].join('\n');
  const intro = d.kind === 'release'
    ? ''
    : `:::note[From the Musa CAD repository]\nThis page shows [\`${d.path}\`](https://github.com/MusaCAD/MusaCAD/blob/${TAG}/${d.path}) as it is in Musa CAD ${ENGINE.version}. The developers keep it next to the code; to change it, edit it there.\n:::\n\n`;
  const out = join('src/content/docs', d.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, fm + intro + transform(text, d.path));
  written++;
}
console.log(`engine-docs: ${written} page(s) from the Musa CAD repository at ${TAG}${SRC ? ` (local checkout ${SRC})` : ' (GitHub)'}`);
