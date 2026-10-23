// Accessibility and performance gates on the built site (dist/):
//   axe (WCAG 2.2 AA) on every page, light and dark;
//   a keyboard walk: the skip link comes first and every focused element shows a focus ring;
//   viewport screenshots at 320 / 768 / 1280 / 2560 for a look (into .cache/shots/);
//   Lighthouse (mobile) on a sample of pages: accessibility must be 100, performance ≥ 95.
// Needs Google Chrome (playwright-core uses the installed `chrome` channel; no download).
//   node scripts/audit.mjs [--no-lighthouse] [--no-axe] [--pages=a,b,c]
import { readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { serve } from './lib/serve.mjs';

const DIST = 'dist';
const args = process.argv.slice(2);
const noLighthouse = args.includes('--no-lighthouse');
const noAxe = args.includes('--no-axe');
const pagesArg = args.find((a) => a.startsWith('--pages='))?.slice(8);

function* htmlFiles(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (f.endsWith('.html')) yield p;
  }
}
const allPages = [...htmlFiles(DIST)]
  .map((f) => '/' + posix.relative(DIST, f).replace(/index\.html$/, ''))
  .filter((p) => !p.endsWith('404.html'))
  .sort();
const pages = pagesArg ? pagesArg.split(',') : allPages;

const { server, url } = await serve(DIST);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failed = 0;

// ---- axe, both themes ----
if (!noAxe) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript((t) => localStorage.setItem('starlight-theme', t), theme);
    const page = await context.newPage();
    for (const p of pages) {
      await page.goto(url + p, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      const violations = results.violations.filter((v) => v.impact !== 'minor' || v.tags.some((t) => t.startsWith('wcag')));
      if (violations.length) {
        failed++;
        console.error(`axe ${theme} ${p}: ${violations.length} violation(s)`);
        for (const v of violations) {
          console.error(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
          for (const n of v.nodes.slice(0, 3)) console.error(`      ${n.target.join(' ')}`);
        }
      } else {
        console.log(`axe ${theme} ${p}: clean`);
      }
    }
    await context.close();
  }
}

// ---- keyboard walk on a sample ----
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  for (const p of pages.slice(0, 4)) {
    await page.goto(url + p, { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
    if (!String(first).includes('sl-skip-link')) {
      failed++;
      console.error(`keyboard ${p}: the first Tab stop is "${first}", not the skip link`);
    }
    const seen = new Set();
    let hidden = 0;
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const visible = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden';
        const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
        const boxShadow = cs.boxShadow !== 'none';
        return { key: el.tagName + '#' + el.id + '.' + el.className + ':' + (el.textContent || '').trim().slice(0, 20), visible, ring: ring || boxShadow };
      });
      if (!info) break;
      if (seen.has(info.key)) break;
      seen.add(info.key);
      if (info.visible && !info.ring) {
        hidden++;
        console.error(`keyboard ${p}: no visible focus ring on ${info.key}`);
      }
    }
    if (hidden) failed++;
    else console.log(`keyboard ${p}: ${seen.size} stops, skip link first, focus visible on each`);
  }
  await context.close();
}

// ---- viewport screenshots ----
{
  mkdirSync('.cache/shots', { recursive: true });
  const widths = [320, 768, 1280, 2560];
  for (const p of pages.slice(0, 3)) {
    for (const w of widths) {
      const context = await browser.newContext({ viewport: { width: w, height: Math.min(1400, Math.round(w * 1.4)) } });
      const page = await context.newPage();
      await page.goto(url + p, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (overflow) {
        failed++;
        console.error(`layout ${p} @${w}: horizontal overflow`);
      }
      const name = (p.replace(/\//g, '_') || '_home') + `@${w}.png`;
      await page.screenshot({ path: join('.cache/shots', name), fullPage: false });
      await context.close();
    }
    console.log(`layout ${p}: no horizontal overflow at ${widths.join('/')}`);
  }
}
await browser.close();

// ---- Lighthouse ----
if (!noLighthouse) {
  const { default: lighthouse } = await import('lighthouse');
  const { launch } = await import('chrome-launcher');
  const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
  const sample = pagesArg ? pages : [pages[0], ...pages.filter((p) => /install-linux|first-drawing|coming-from-autocad/.test(p))].filter(Boolean);
  const mins = { accessibility: 1, performance: 0.95, 'best-practices': 0.9, seo: 0.9 };
  for (const p of sample) {
    const result = await lighthouse(url + p, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: Object.keys(mins) });
    const cats = result.lhr.categories;
    const line = Object.keys(mins).map((k) => `${k} ${Math.round((cats[k]?.score ?? 0) * 100)}`).join('  ');
    const bad = Object.entries(mins).filter(([k, min]) => (cats[k]?.score ?? 0) < min);
    if (bad.length) {
      failed++;
      console.error(`lighthouse ${p}: ${line}  FAIL on ${bad.map(([k]) => k).join(', ')}`);
      const audits = result.lhr.audits;
      for (const [k] of bad) for (const ref of cats[k].auditRefs) {
        const a = audits[ref.id];
        if (a && a.score !== null && a.score < 1 && ref.weight > 0) console.error(`    ${a.id}: ${a.title} (${a.displayValue ?? ''})`);
      }
    } else console.log(`lighthouse ${p}: ${line}`);
  }
  await chrome.kill();
}

server.close();
if (failed) {
  console.error(`\naudit: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\naudit: all gates pass');
