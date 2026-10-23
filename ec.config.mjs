// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Code block settings. They live here, not in astro.config.mjs, because the <Code> component
// (used by the command pages) can only load settings that include a plugin from this file.
import { defineEcConfig } from '@astrojs/starlight/expressive-code';
import { musacadCommandLine, musacadGrammar } from './src/plugins/ec-musacad.mjs';

export default defineEcConfig({
  themes: ['github-dark', 'github-light'],
  useStarlightUiThemeColors: true,
  shiki: { langs: [musacadGrammar] },
  plugins: [musacadCommandLine()],
  // Long prompts and commands wrap instead of scrolling: nothing hides off the right edge on
  // a phone, and a code block never becomes a scroll-region landmark.
  defaultProps: { wrap: true, preserveIndent: true },
  styleOverrides: {
    borderRadius: '0.375rem',
    codeFontFamily: 'var(--__sl-font-mono)',
    codeFontSize: 'var(--sl-text-code)',
  },
});
