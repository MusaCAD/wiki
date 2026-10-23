// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Root-relative links in content (`/get-started/`) are rewritten to honour the configured
// base path, so moving the wiki from wiki.musacad.org to musacad.org/wiki is a change to
// BASE in wiki.config.mjs and nothing in the pages.
import { visit } from 'unist-util-visit';
import { BASE } from '../../wiki.config.mjs';

export function remarkBaseLinks() {
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  return (tree) => {
    if (base === '/') return;
    visit(tree, (node) => {
      if ((node.type === 'link' || node.type === 'definition') && typeof node.url === 'string' && node.url.startsWith('/') && !node.url.startsWith('//')) {
        node.url = base + node.url.slice(1);
      }
      if (node.type === 'image' && typeof node.url === 'string' && node.url.startsWith('/') && !node.url.startsWith('//')) {
        node.url = base + node.url.slice(1);
      }
    });
  };
}
