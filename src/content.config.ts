// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { blogSchema } from 'starlight-blog/schema';

/** A release version as the application prints it: `0.8.0`. */
const releaseVersion = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'must be a release version such as 0.8.0 (no leading v)');

/**
 * The fields every page of the wiki carries, read by the status line, the version banner and
 * the checks. They are optional here only because pages the blog generates (its index, tag and
 * author pages) have no file to put them in; scripts/check-pages.mjs requires them on every
 * file under src/content/docs/, and CI runs it.
 */
export const wikiFrontmatter = z.object({
  /** One or two sentences: search results, link previews and AI tools read it. Required on
   * every file (scripts/check-pages.mjs); optional here for the blog's generated pages. */
  description: z.string().min(20, 'description: write at least a sentence').optional(),
  /**
   * Who writes the page.
   * generated: written by scripts from the application's own data; never edited by hand.
   * assisted:  drafted from a release's changes, then read and corrected by a person.
   * human:     written by a person; automation may flag it as out of date, never rewrite it.
   */
  tier: z.enum(['generated', 'assisted', 'human']).optional(),
  /** The Musa CAD release the page was last checked against. */
  appliesTo: releaseVersion.optional(),
  /** When a person last checked the page against that release. */
  lastVerified: z.coerce.date().optional(),
  /** complete, partial (the page says what it leaves out), or stub (only what the application reports). */
  status: z.enum(['complete', 'partial', 'stub']).optional(),
  /** The kind of page, which decides its layout and the rules it follows. */
  kind: z
    .enum([
      'landing',
      'guide',
      'command',
      'sysvar',
      'reference',
      'tutorial',
      'troubleshooting',
      'release',
      'developer',
      'project',
      'blog',
    ])
    .default('guide'),
  /** kind: command — the command's name as the application lists it, e.g. LINE. */
  command: z.string().regex(/^-?[A-Z0-9]+$/).optional(),
  /** kind: sysvar — the variable's name, e.g. PICKBOX. */
  sysvar: z.string().regex(/^[A-Z0-9]+$/).optional(),
  /** The platforms the page is about; leave out for all of them. */
  platforms: z.array(z.enum(['windows', 'linux', 'macos'])).optional(),
  /** kind: tutorial. */
  tutorial: z
    .object({
      level: z.enum(['beginner', 'intermediate', 'advanced']),
      /** e.g. "20 minutes" */
      time: z.string(),
      /** The example under examples/ whose picture opens the page and whose file is offered for download. */
      example: z.string().optional(),
    })
    .optional(),
  /** kind: troubleshooting — the problem as a user would describe it, who it affects, and why. */
  symptom: z
    .object({
      affects: z.string(),
      cause: z.string(),
    })
    .optional(),
  /** Pages rendered at build time from a file in the Musa CAD repository (ARCHITECTURE.md ...). */
  sourceOf: z.string().optional(),
});

export type WikiFrontmatter = z.infer<typeof wikiFrontmatter>;

const releaseSchema = z.object({
  version: releaseVersion,
  tag: z.string(),
  date: z.coerce.date(),
  formatVersion: z.number().int(),
  assets: z.array(z.enum(['exe', 'appimage', 'flatpak', 'dmg'])),
  windowsInstallerPending: z.boolean().optional(),
  summary: z.string(),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({ extend: (context) => blogSchema(context).extend(wikiFrontmatter.shape) }),
  }),
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema({
      extend: z
        .object({
          'mc.readingSettings': z.string(),
          'mc.readingSettings.theme': z.string(),
          'mc.readingSettings.fontSize': z.string(),
          'mc.readingSettings.lineSpacing': z.string(),
          'mc.readingSettings.width': z.string(),
          'mc.readingSettings.dyslexicFont': z.string(),
          'mc.readingSettings.motion': z.string(),
          'mc.readingSettings.codeSize': z.string(),
          'mc.readingSettings.reset': z.string(),
          'mc.readingSettings.close': z.string(),
          'mc.reportProblem': z.string(),
          'mc.appliesTo': z.string(),
          'mc.verified': z.string(),
          'mc.status.complete': z.string(),
          'mc.status.partial': z.string(),
          'mc.status.stub': z.string(),
          'mc.stale.behind': z.string(),
          'mc.stale.current': z.string(),
          'mc.stub.notice': z.string(),
          'mc.partial.notice': z.string(),
          'mc.home': z.string(),
          'mc.footer.licence': z.string(),
          'mc.footer.examples': z.string(),
          'mc.footer.trademark': z.string(),
          'mc.figure.renderedBy': z.string(),
          'mc.figure.download': z.string(),
          'mc.searchHint': z.string(),
        })
        .partial(),
    }),
  }),
  releases: defineCollection({ loader: file('./src/data/releases.json'), schema: releaseSchema }),
};
