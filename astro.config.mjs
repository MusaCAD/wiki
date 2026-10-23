// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import { SITE_URL, BASE, ENGINE, WIKI_REPO, SITE_HOME, LOCALES } from './wiki.config.mjs';
import { remarkBaseLinks } from './src/plugins/remark-base-links.mjs';

const locales = Object.fromEntries(
  Object.entries(LOCALES)
    .filter(([, l]) => l.enabled)
    .map(([key, l]) => [key, { label: l.label, lang: l.lang }])
);

export default defineConfig({
  site: SITE_URL,
  base: BASE,
  output: 'static',
  trailingSlash: 'ignore',
  // Astro 7 defaults to its own Markdown processor; Starlight runs on unified, so the plugin goes there.
  markdown: { processor: unified({ remarkPlugins: [remarkBaseLinks] }) },
  integrations: [
    starlight({
      title: 'Musa CAD Wiki',
      description:
        'The documentation for Musa CAD, the free, open-source 2D CAD application: install guides, the user manual, every command, file formats, scripting and tutorials.',
      logo: { src: './public/musacad_logo.svg', alt: '' },
      favicon: '/favicon.png',
      defaultLocale: 'root',
      locales,
      social: [
        { icon: 'github', label: 'Musa CAD on GitHub', href: ENGINE.repo },
        { icon: 'external', label: 'musacad.org', href: SITE_HOME },
      ],
      editLink: { baseUrl: `${WIKI_REPO}/edit/main/` },
      lastUpdated: true,
      pagination: true,
      credits: false,
      disable404Route: true, // src/pages/404.astro claims /404 instead (see that file)
      titleDelimiter: '·',
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      customCss: [
        '@fontsource-variable/inter/wght.css',
        '@fontsource-variable/space-grotesk/wght.css',
        '@fontsource-variable/jetbrains-mono/wght.css',
        '@fontsource/opendyslexic/400.css',
        '@fontsource/opendyslexic/700.css',
        './src/styles/tokens.css',
        './src/styles/wiki.css',
      ],
      head: [
        { tag: 'meta', attrs: { name: 'theme-color', content: '#faf9f6', media: '(prefers-color-scheme: light)' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#232323', media: '(prefers-color-scheme: dark)' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${BASE}apple-touch-icon.png` } },
        { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '48x48', href: `${BASE}favicon-48.png` } },
        { tag: 'meta', attrs: { property: 'og:site_name', content: 'Musa CAD Wiki' } },
        { tag: 'meta', attrs: { property: 'og:image', content: `${SITE_URL}${BASE}og-image.png` } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Musa CAD, free and open-source 2D CAD with AutoCAD-style commands, drafting a house plan' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: `${SITE_URL}${BASE}og-image.png` } },
        { tag: 'meta', attrs: { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1' } },
        { tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', title: 'The wiki for AI assistants (llms.txt)', href: `${BASE}llms.txt` } },
      ],
      components: {
        Head: './src/components/overrides/Head.astro',
        Search: './src/components/overrides/Search.astro',
        Header: './src/components/overrides/Header.astro',
        Footer: './src/components/overrides/Footer.astro',
        Banner: './src/components/overrides/Banner.astro',
        PageTitle: './src/components/overrides/PageTitle.astro',
        MobileMenuFooter: './src/components/overrides/MobileMenuFooter.astro',
      },
      routeMiddleware: './src/route-data.ts',
      plugins: [
        starlightBlog({
          title: 'Blog',
          prefix: 'blog',
          navigation: 'header-end',
          postCount: 10,
          recentPostCount: 6,
          metrics: { readingTime: true },
          authors: {
            pranay: {
              name: 'Pranay Kiran',
              title: 'Musa CAD maintainer',
              url: 'https://github.com/KiranPranay',
            },
          },
        }),
      ],
      // Code block settings are in ec.config.mjs.
      // The navigation. A section is listed here once its first pages exist; the home page
      // says which sections are still being written.
      sidebar: [
        {
          label: 'Get started',
          items: [
            { slug: 'get-started' },
            { slug: 'get-started/what-is-musa-cad' },
            { slug: 'get-started/install-windows' },
            { slug: 'get-started/install-linux' },
            { slug: 'get-started/install-macos' },
            { slug: 'get-started/build-from-source' },
            { slug: 'get-started/first-drawing' },
            { slug: 'get-started/interface-tour' },
            { slug: 'get-started/coming-from-autocad' },
          ],
        },
        {
          label: 'User manual',
          items: [{ slug: 'user-manual' }, { slug: 'user-manual/dynamic-input' }],
        },
        {
          label: 'Command reference',
          items: [
            { slug: 'reference' },
            { slug: 'reference/system-variables' },
            { slug: 'reference/keyboard-shortcuts' },
            { slug: 'reference/ribbon' },
          ],
        },
        {
          label: 'Scripting and automation',
          items: [
            { slug: 'scripting' },
            { slug: 'scripting/command-line' },
            { slug: 'scripting/drawings-from-code' },
            { slug: 'scripting/ai-workflows' },
          ],
        },
        {
          label: 'File formats',
          items: [{ slug: 'file-formats' }, { slug: 'file-formats/musa-format' }],
        },
      ],
    }),
  ],
});
