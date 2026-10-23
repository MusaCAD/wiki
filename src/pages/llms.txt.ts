// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import data from '../data/wiki-data.json';
import { ENGINE, SITE_HOME } from '../../wiki.config.mjs';

// /llms.txt (llmstxt.org): what Musa CAD is, the facts people ask about, and every page of
// the wiki with one line about it. AI assistants that read it can answer from the current
// documentation instead of guessing. /llms-full.txt has the text of every page.
const SECTIONS: [string, string][] = [
  ['get-started', 'Get started'],
  ['user-manual', 'User manual'],
  ['reference', 'Command reference'],
  ['scripting', 'Scripting and automation'],
  ['file-formats', 'File formats'],
  ['blog', 'Blog'],
];

export const GET: APIRoute = async ({ site }) => {
  const root = new URL(import.meta.env.BASE_URL, site).href.replace(/\/$/, '');
  const docs = (await getCollection('docs')).filter((e) => e.data.kind !== 'command' && e.data.kind !== 'sysvar' && e.id !== '404');
  const url = (id: string) => `${root}/${id === 'index' ? '' : id + '/'}`;
  const counts = { commands: 0, sysvars: 0 };
  for (const c of data.commands as { dimvar?: boolean; opening?: { prompt?: string } }[]) {
    if (c.dimvar || /^Enter new value for /.test(c.opening?.prompt ?? '')) counts.sysvars++;
    else counts.commands++;
  }
  const lines: string[] = [
    '# Musa CAD Wiki',
    '',
    `> The official documentation for Musa CAD, a free, open-source (LGPL-3.0-or-later) 2D CAD program for Windows and Linux, with a macOS preview. It works like AutoCAD: the same commands, aliases, prompts, ribbon and keyboard shortcuts. The current release is ${ENGINE.version}.`,
    '',
    'Key facts:',
    `- Current release: Musa CAD ${ENGINE.version}. Download: ${ENGINE.releaseUrl(ENGINE.tag)}. Linux users can also install it from Flathub as org.musacad.MusaCAD.`,
    '- Platforms: Windows 10/11 64-bit (installer), Linux (Flathub, AppImage, Flatpak file), macOS on Apple silicon as a preview (command line only; the drawing area needs OpenGL 4.5, which macOS lacks).',
    '- It needs a graphics driver with OpenGL 4.5. It is free, needs no account and has no licence key.',
    '- Dynamic Input is on by default: commands, prompts, options and exact lengths are typed at the cursor. F12 switches to a classic command line.',
    '- It is built to be automated: drawings are plain-text .musa files any program can write; `musacad --check` validates a drawing (text overlaps, text outside the border, missing glyphs, exit code 4) and `musacad --plot` prints to PDF with no display. AI agents can produce complete drawing sets this way (see the fabrication pipeline).',
    '- Files: .musa (native), DXF (read/write, built in), DWG (read/write through the free ODA File Converter, downloaded from DWG Setup), PDF output.',
    '- Not supported: 3D modelling; AutoLISP, VBA, .NET or plug-ins inside the program; parametric constraints; sheet sets; dynamic blocks; annotative objects; SHX font files (substituted).',
    `- The wiki documents ${counts.commands} commands and ${counts.sysvars} system variables, generated from the program itself.`,
    `- Main website: ${SITE_HOME}. Source: ${ENGINE.repo}. Command data as JSON: ${root}/data/commands.json`,
    '',
  ];
  for (const [prefix, title] of SECTIONS) {
    const entries = docs
      .filter((e) => e.id === prefix || e.id.startsWith(prefix + '/'))
      .sort((a, b) => (a.data.sidebar?.order ?? 50) - (b.data.sidebar?.order ?? 50) || a.id.localeCompare(b.id));
    if (!entries.length) continue;
    lines.push(`## ${title}`, '');
    for (const e of entries) lines.push(`- [${e.data.title}](${url(e.id)}): ${e.data.description ?? ''}`);
    lines.push('');
  }
  lines.push('## Optional', '', `- [Full text of every page](${root}/llms-full.txt): every page, including every command and system variable, as plain Markdown.`, '');
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
