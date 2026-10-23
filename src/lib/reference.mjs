// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// One reading of src/data/wiki-data.json, shared by the page generator, the components that
// draw the reference pages, and the checks. Plain JavaScript, so Node scripts and Astro
// components import the same rules.

/** A command's page slug: LINE -> line, -LAYER -> dash-layer. */
export const slugOf = (name) => name.toLowerCase().replace(/^-/, 'dash-');

/** True when the command is a system variable: it asks for a new value, or it is a DIM variable. */
export const isSysvar = (c) => c.dimvar === true || /^Enter new value for /i.test(c.opening?.prompt ?? '');

/** The value a system variable starts with, from its prompt: `Enter new value for PICKBOX <10>:` -> "10". */
export const defaultOf = (c) => {
  const m = /<([^>]*)>\s*:\s*$/.exec(c.opening?.prompt ?? '');
  return m ? m[1] : null;
};

/** The URL path of a command's or variable's page. */
export const pathOf = (c) => (isSysvar(c) ? `/reference/system-variables/${slugOf(c.name)}/` : `/reference/commands/${slugOf(c.name)}/`);

/** Lookups built once per data file. */
export function indexData(data) {
  const byName = new Map(data.commands.map((c) => [c.name, c]));
  const byAlias = new Map();
  for (const c of data.commands) for (const a of [c.name, ...c.aliases]) byAlias.set(a.toUpperCase(), c);

  // Where each command sits on the ribbon: tab › panel › tool (› menu entry).
  const ribbon = new Map();
  const add = (alias, loc) => {
    const c = byAlias.get(String(alias).toUpperCase());
    if (!c) return;
    if (!ribbon.has(c.name)) ribbon.set(c.name, []);
    const list = ribbon.get(c.name);
    const key = JSON.stringify(loc);
    if (!list.some((l) => JSON.stringify(l) === key)) list.push(loc);
  };
  const walkMenu = (items, base) => {
    for (const it of items ?? []) {
      // A split button's menu repeats the button itself ("Trim" under "Trim"): one is enough.
      const repeat = it.label === base.tool && !it.macro && !it.menu;
      if (it.command && repeat) add(it.command, { ...base });
      else if (it.command) add(it.command, { ...base, item: it.label, macro: it.macro });
      if (it.menu) walkMenu(it.menu, { ...base, item: it.label });
    }
  };
  for (const tab of data.ui?.ribbon ?? []) {
    for (const panel of tab.panels) {
      for (const tool of panel.tools) {
        const base = { tab: tab.title, contextual: Boolean(tab.contextual), panel: panel.title, tool: tool.label, slideout: Boolean(tool.slideout) };
        if (tool.command) add(tool.command, { ...base, macro: tool.macro });
        walkMenu(tool.menu, base);
      }
    }
  }
  return { byName, byAlias, ribbon };
}

/** A ribbon location in words: "Home › Draw › Circle › Center, Radius". */
export const locationText = (l) =>
  [l.tab + (l.contextual ? ' (contextual tab)' : ''), l.panel + (l.slideout ? ' (slide-out)' : ''), l.tool, l.item]
    .filter(Boolean)
    .join(' › ');

/** The window a command opens, in words, or null. */
export function windowText(c) {
  const w = c.opening?.window;
  if (!w) return null;
  if (w.startsWith('window:')) {
    const action = w.slice(7);
    const known = {
      NEW: 'starts a new drawing in a new tab',
      OPEN: 'shows the Open dialog',
      QSAVE: 'saves the drawing (the first time, it shows the Save dialog)',
      SAVEAS: 'shows the Save As dialog',
      CLOSE: 'closes the drawing in front',
      CLOSEALL: 'closes every drawing',
      QUIT: 'closes Musa CAD',
      IMPORT: 'shows the Import dialog',
      EXPORT: 'shows the Export dialog',
      ALIASEDIT: 'opens the Edit Aliases window',
      REINIT: 'reads your command aliases (the PGP file) again',
      CUI: 'opens the Customize User Interface window',
      MLEADERSTYLE: 'opens the Multileader Style Manager',
      MLSTYLE: 'opens the Multiline Style window',
      TOOLPALETTES: 'opens the Tool Palettes',
      TOOLPALETTESCLOSE: 'closes the Tool Palettes',
      BEDIT: 'opens the Block Editor',
      DATALINK: 'opens the Data Link Manager',
    };
    return known[action] ?? `is carried out by the application window (${action})`;
  }
  return `opens the ${w} window`;
}

/** Exit codes from the command line's help text: [{ code, meaning }]. */
export function exitCodes(help) {
  const block = /Exit codes:\n([\s\S]*?)\n\n/.exec(help ?? '');
  if (!block) return [];
  const out = [];
  for (const line of block[1].split('\n')) {
    const m = /^\s+(\d+)\s+(.*)$/.exec(line);
    if (m) out.push({ code: Number(m[1]), meaning: m[2].trim() });
    else if (out.length && line.trim()) out[out.length - 1].meaning += ' ' + line.trim();
  }
  return out;
}
