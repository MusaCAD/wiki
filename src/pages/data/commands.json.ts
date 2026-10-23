// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

import type { APIRoute } from 'astro';
import data from '../../data/wiki-data.json';
import origins from '../../data/command-origins.json';
import { indexData, isSysvar, defaultOf, locationText, windowText, pathOf } from '../../lib/reference.mjs';

// /data/commands.json: every Musa CAD command and system variable as data, read from the
// program itself, for scripts and AI tools. Free to use (CC0).
export const GET: APIRoute = ({ site }) => {
  const root = new URL(import.meta.env.BASE_URL, site).href.replace(/\/$/, '');
  const { ribbon } = indexData(data);
  const items = data.commands.map((c) => {
    const sysvar = isSysvar(c);
    return {
      name: c.name,
      kind: sysvar ? 'system variable' : 'command',
      aliases: c.aliases.filter((a: string) => a !== c.name),
      description: c.description,
      ...(sysvar ? { startsAs: defaultOf(c) } : { ribbon: (ribbon.get(c.name) ?? []).map(locationText) }),
      ...(windowText(c) ? { firstAction: `It ${windowText(c)}.` } : c.opening?.prompt ? { firstPrompt: c.opening.prompt.trim() } : {}),
      since: (origins as Record<string, string | null>)[c.name],
      url: root + pathOf(c),
    };
  });
  const body = {
    about: 'Every Musa CAD command and system variable, read from the program with musacad --dump-wiki-data.',
    licence: 'CC0-1.0',
    version: data.version,
    formatVersion: data.formatVersion,
    documentation: `${root}/`,
    commands: items,
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
