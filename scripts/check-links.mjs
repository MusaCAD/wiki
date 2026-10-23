// Internal links and anchors in dist/, and (with --external) the GitHub / musacad.org links out.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, posix } from 'node:path';

const DIST = 'dist';
const external = process.argv.includes('--external');

function* htmlFiles(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (f.endsWith('.html')) yield p;
  }
}
const ids = new Map();
function idsOf(file) {
  if (!ids.has(file)) {
    const html = readFileSync(file, 'utf8');
    ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(file);
}
function fileFor(urlPath) {
  const clean = decodeURIComponent(urlPath.replace(/\/$/, ''));
  const candidates = [join(DIST, clean, 'index.html'), join(DIST, clean), join(DIST, clean + '.html')];
  if (clean === '') candidates.unshift(join(DIST, 'index.html'));
  return candidates.find((c) => existsSync(c) && statSync(c).isFile());
}

const problems = [];
const externalLinks = new Map();
let checked = 0;
for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  const pageUrl = '/' + posix.relative(DIST, file).replace(/index\.html$/, '').replace(/\.html$/, '');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('data:') || raw.startsWith('javascript:')) continue;
    if (/^https?:\/\//.test(raw)) {
      if (/^https:\/\/(github\.com|musacad\.org|flathub\.org|wiki\.musacad\.org)\//.test(raw)) externalLinks.set(raw, pageUrl);
      continue;
    }
    checked++;
    const [pathPart, hash] = raw.split('#');
    let target;
    if (pathPart === '' || pathPart === undefined) target = file;
    else {
      const abs = pathPart.startsWith('/') ? pathPart : posix.join(dirname(pageUrl.endsWith('/') ? pageUrl : pageUrl + '/'), pathPart);
      target = fileFor(abs.split('?')[0]);
    }
    if (!target) {
      problems.push(`${pageUrl}: broken link ${raw}`);
      continue;
    }
    if (hash && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(hash))) {
      problems.push(`${pageUrl}: missing anchor #${hash} in ${raw}`);
    }
  }
}

if (external) {
  for (const [url, from] of externalLinks) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'user-agent': 'musacad-wiki-linkcheck' } });
      if (res.status >= 400) problems.push(`${from}: external ${url} → ${res.status}`);
    } catch (e) {
      problems.push(`${from}: external ${url} → ${e.message}`);
    }
  }
}

console.log(`links: ${checked} internal reference(s) checked, ${externalLinks.size} external link(s) ${external ? 'checked' : 'listed (use --external to check)'}`);
if (problems.length) {
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
