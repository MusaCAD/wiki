// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import data from '../data/wiki-data.json';
import origins from '../data/command-origins.json';
import flangeCode from '../../examples/flange.py?raw';
import { mdxToText, referenceText } from '../lib/plaintext.mjs';
import { ENGINE } from '../../wiki.config.mjs';

// /llms-full.txt: the text of every page in one file, in the order of the navigation, with
// the facts the command pages draw from Musa CAD written out. For AI tools and offline reading.
const ORDER = ['index', 'get-started', 'user-manual', 'scripting', 'file-formats', 'reference', 'blog'];

export const GET: APIRoute = async ({ site }) => {
  const root = new URL(import.meta.env.BASE_URL, site).href.replace(/\/$/, '');
  const rank = (id: string) => {
    const i = ORDER.findIndex((p) => id === p || id.startsWith(p + '/'));
    return i < 0 ? ORDER.length : i;
  };
  const docs = (await getCollection('docs'))
    .filter((e) => e.id !== '404')
    .sort((a, b) => rank(a.id) - rank(b.id) || (a.data.sidebar?.order ?? 50) - (b.data.sidebar?.order ?? 50) || a.id.localeCompare(b.id));
  const out: string[] = [
    `# Musa CAD Wiki — full text`,
    '',
    `Every page of ${root}/ as plain Markdown, for Musa CAD ${ENGINE.version}. Each page starts with its address.`,
    '',
  ];
  for (const e of docs) {
    const d = e.data as typeof e.data & { kind?: string; command?: string; sysvar?: string; appliesTo?: string; status?: string };
    const url = `${root}/${e.id === 'index' ? '' : e.id + '/'}`;
    out.push('---', '', `# ${d.title}`, '', `URL: ${url}`);
    if (d.appliesTo) out.push(`Checked against: Musa CAD ${d.appliesTo}${d.status ? ` (${d.status})` : ''}`);
    out.push('');
    if (d.kind === 'command' || d.kind === 'sysvar') out.push(referenceText(data, origins, d.command ?? d.sysvar, root), '');
    const body = mdxToText(e.body ?? '', { data, origins, site: root, raw: { flangeCode } });
    if (body) out.push(body, '');
  }
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
