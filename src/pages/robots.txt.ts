// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

import type { APIRoute } from 'astro';

// Every crawler is welcome: search engines and AI assistants alike. The more of them that
// read the wiki, the more accurate the answers people get about Musa CAD.
export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(`${import.meta.env.BASE_URL}${p}`, site).href;
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${abs('sitemap-index.xml')}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
