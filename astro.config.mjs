// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { SITE_URL, BASE, ENGINE, WIKI_REPO, SITE_HOME, LOCALES } from './wiki.config.mjs';
import { musacadCommandLine, musacadGrammar } from './src/plugins/ec-musacad.mjs';
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
      expressiveCode: {
        themes: ['github-dark', 'github-light'],
        useStarlightUiThemeColors: true,
        shiki: { langs: [musacadGrammar] },
        plugins: [musacadCommandLine()],
        // Long prompts and commands wrap instead of scrolling: nothing hides off the right edge
        // on a phone, and a code block never becomes a scroll-region landmark.
        defaultProps: { wrap: true, preserveIndent: true },
        styleOverrides: {
          borderRadius: '0.375rem',
          codeFontFamily: 'var(--__sl-font-mono)',
          codeFontSize: 'var(--sl-text-code)',
        },
      },
      // The information architecture of §4. A section appears here the moment it has a landing
      // page; sections not yet written are listed on the home page, unlinked.
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
      ],
    }),
  ],
});
