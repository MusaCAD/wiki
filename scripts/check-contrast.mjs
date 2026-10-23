// WCAG contrast of the token pairs the wiki actually uses, in every theme. Fails under AA.
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');

/** Pull `--name: value;` declarations out of the block that starts with `selector`. */
function block(selector) {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`tokens.css: block ${selector} not found`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let i = open;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) break;
  }
  const body = css.slice(open + 1, i);
  const vars = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}
const dark = block(':root,\n::backdrop');
const light = { ...dark, ...block(":root[data-theme='light']") };
const hcDark = { ...dark, ...block(":root[data-contrast='high'] {") };
const hcLight = { ...light, ...block(":root[data-contrast='high'][data-theme='light']") };

function resolve(vars, value, depth = 0) {
  if (depth > 10) throw new Error(`cyclic token ${value}`);
  const m = /^var\((--[\w-]+)\)$/.exec(value.trim());
  if (m) return resolve(vars, vars[m[1]] ?? '', depth + 1);
  return value.trim();
}
function hex(vars, name) {
  const v = resolve(vars, vars[name] ?? '');
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (!m) throw new Error(`${name} is "${v}", not a 6-digit hex colour`);
  return m[1];
}
function lum(h) {
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [foreground, background, minimum, what it is]
const pairs = [
  ['--sl-color-gray-2', '--sl-color-black', 4.5, 'body text on the page'],
  ['--sl-color-white', '--sl-color-black', 4.5, 'headings on the page'],
  ['--sl-color-gray-3', '--sl-color-black', 4.5, 'secondary text on the page'],
  ['--sl-color-gray-3', '--sl-color-gray-6', 4.5, 'secondary text on panels and the nav'],
  ['--mc-ink-faint', '--mc-panel', 4.5, 'faint text on recessed panels'],
  ['--mc-ink-faint', '--sl-color-black', 4.5, 'faint text (status line, footer) on the page'],
  ['--sl-color-text-accent', '--sl-color-black', 4.5, 'links on the page'],
  ['--sl-color-text-accent', '--sl-color-gray-6', 4.5, 'links on panels and the sidebar'],
  ['--sl-color-text-invert', '--sl-color-text-accent', 4.5, 'the current sidebar item'],
  ['--sl-color-gray-2', '--sl-color-bg-inline-code', 4.5, 'inline code'],
  ['--sl-color-white', '--mc-paper-2', 4.5, 'card titles and keys'],
  ['--mc-status-ok', '--mc-paper-2', 4.5, 'status chip: complete'],
  ['--mc-status-warn', '--mc-paper-2', 4.5, 'status chip: partial'],
  ['--mc-status-fail', '--mc-paper-2', 4.5, 'status chip: stub'],
  ['--mc-cmd-text', '--mc-cmd-bg', 4.5, 'command line text'],
  ['--mc-cmd-prompt', '--mc-cmd-bg', 4.5, 'command line prompt'],
  ['--mc-cmd-option', '--mc-cmd-bg', 4.5, 'command line options'],
  ['--mc-cmd-default', '--mc-cmd-bg', 4.5, 'command line defaults'],
  ['--mc-cmd-echo', '--mc-cmd-bg', 4.5, 'command line echoes'],
  ['--sl-color-orange-high', '--sl-color-orange-low', 4.5, 'fallback-content notice'],
  ['--sl-color-gray-4', '--sl-color-black', 3, 'hairline ticks and non-text marks (3:1 for graphics)'],
];

let bad = 0;
for (const [name, vars] of [['dark', dark], ['light', light], ['high-contrast dark', hcDark], ['high-contrast light', hcLight]]) {
  console.log(`\n${name}`);
  for (const [fg, bg, min, what] of pairs) {
    const r = ratio(hex(vars, fg), hex(vars, bg));
    const ok = r >= min;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)} ≥ ${min}  ${what}  (${fg} on ${bg})`);
  }
}
if (bad) {
  console.error(`\ncontrast: ${bad} pair(s) below the minimum`);
  process.exit(1);
}
console.log('\ncontrast: every pair passes');
