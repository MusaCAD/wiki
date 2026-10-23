// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Turn a page's MDX into plain Markdown that a person or an AI tool can read without the
// site: imports dropped, components replaced by what they show. Used by /llms-full.txt.
import { indexData, isSysvar, defaultOf, locationText, windowText, pathOf, exitCodes } from './reference.mjs';

/** The facts a command or variable page shows at its top, as text. */
export function referenceText(data, origins, name, site) {
  const { byName, ribbon } = indexData(data);
  const c = byName.get(name);
  if (!c) return '';
  const lines = [];
  const others = c.aliases.filter((a) => a !== c.name);
  lines.push(`${c.description}`);
  lines.push('');
  lines.push(`- Type: ${[c.name, ...others].join(' or ')}`);
  if (isSysvar(c)) {
    const d = defaultOf(c);
    if (d !== null) lines.push(`- Starts as: ${d}`);
  } else {
    const locs = ribbon.get(c.name) ?? [];
    lines.push(`- On the ribbon: ${locs.length ? locs.map(locationText).join('; ') : 'not on the ribbon'}`);
  }
  const w = windowText(c);
  if (w) lines.push(`- What it does first: it ${w}.`);
  else if (c.opening?.prompt) lines.push(`- What it asks first: \`${c.opening.prompt.trim()}\``);
  if (origins[c.name]) lines.push(`- Since: Musa CAD ${origins[c.name]}`);
  lines.push(`- Page: ${site}${pathOf(c)}`);
  return lines.join('\n');
}

/** Lists the generated tables need, as text. */
export function componentText(name, data, origins, site) {
  const { ribbon } = indexData(data);
  if (name === 'CommandIndex-command' || name === 'CommandIndex-sysvar') {
    const want = name.endsWith('sysvar');
    return data.commands
      .filter((c) => isSysvar(c) === want)
      .map((c) => `- [${c.name}](${site}${pathOf(c)})${c.aliases.length > 1 ? ` (${c.aliases.filter((a) => a !== c.name).join(', ')})` : ''}: ${c.description}${want && defaultOf(c) ? ` Starts as ${defaultOf(c)}.` : ''}`)
      .join('\n');
  }
  if (name === 'ShortcutTable') {
    const out = data.ui.shortcuts.map((s) => `- ${s.keys.join(' or ')}: ${s.action}${s.description ? ` (${s.description.replace(/^[A-Z0-9]+ \([^)]*\)\s*/, '')})` : ''}`);
    out.push('', 'In the drawing area:');
    for (const v of data.ui.viewportKeys) out.push(`- ${v.keys}: ${v.action}`);
    return out.join('\n');
  }
  if (name === 'RibbonMap') {
    const out = [];
    for (const tab of data.ui.ribbon) {
      out.push(`### ${tab.title}${tab.contextual ? ' (contextual)' : ''}`);
      for (const p of tab.panels) {
        const tools = p.tools.map((t) => `${t.label}${t.command ? ` [${t.command}]` : ''}${t.placeholder ? ' (not in Musa CAD yet)' : ''}${t.menu?.length ? ` {${t.menu.map((m) => m.label + (m.command ? ` [${m.command}]` : '')).join(', ')}}` : ''}`);
        out.push(`- ${p.title}: ${tools.join('; ')}`);
      }
    }
    return out.join('\n');
  }
  if (name === 'CliHelp-help') return '```\n' + data.cli.help.trimEnd() + '\n```';
  if (name === 'CliHelp-exit-codes') return exitCodes(data.cli.help).map((e) => `- ${e.code}: ${e.meaning}`).join('\n');
  return '';
}

/** MDX body -> plain Markdown. */
export function mdxToText(body, { data, origins, site, rendered = {}, raw = {} }) {
  let s = body;
  s = s.replace(/^import .*$/gm, '');
  s = s.replace(/<Figure\s+[^>]*?id="([^"]+)"[^>]*?alt="([^"]*)"[^>]*?\/>/gs, (_, id, alt) => `[Drawing: ${alt}](${site}/rendered/${id}.svg)`);
  s = s.replace(/<Screenshot\s+[^>]*?alt="([^"]*)"[^>]*?\/>/gs, (_, alt) => `[Screenshot: ${alt}]`);
  s = s.replace(/<LinkCard\s+title="([^"]*)"\s+description="([^"]*)"\s+href="([^"]*)"\s*\/>/gs, (_, t, d, h) => `- [${t}](${h.startsWith('/') ? site + h : h}): ${d}`);
  s = s.replace(/<Card\s+title="([^"]*)"\s*>/g, (_, t) => `**${t}.** `);
  s = s.replace(/<CommandIndex\s+kind="(command|sysvar)"\s*\/>/g, (_, k) => componentText(`CommandIndex-${k}`, data, origins, site));
  s = s.replace(/<ShortcutTable\s*\/>/g, () => componentText('ShortcutTable', data, origins, site));
  s = s.replace(/<RibbonMap\s*\/>/g, () => componentText('RibbonMap', data, origins, site));
  s = s.replace(/<CliHelp\s+show="exit-codes"\s*\/>/g, () => componentText('CliHelp-exit-codes', data, origins, site));
  s = s.replace(/<CliHelp\s*\/>/g, () => componentText('CliHelp-help', data, origins, site));
  s = s.replace(/<Code\s+code=\{(\w+)\}\s+lang="(\w+)"\s+title="([^"]*)"\s*\/>/g, (_, v, lang, title) =>
    raw[v] !== undefined ? `${title}:\n\n\`\`\`${lang}\n${raw[v].trimEnd()}\n\`\`\`` : `(${title} is shown on the page)`
  );
  s = s.replace(/<Platforms\s+items=\{\[([^\]]*)\]\}\s*\/>/g, (_, items) => `Applies to: ${items.replace(/['"]/g, '').split(',').map((x) => x.trim()).join(', ')}`);
  s = s.replace(/<FormatHistory\s*\/>/g, '(The format version table is on the page.)');
  // Any other component or HTML tag: keep what is inside it.
  s = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  s = s.replace(/<\/?[A-Za-z][^>]*>/g, '');
  s = s.replace(/\]\(\//g, `](${site}/`);
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}
