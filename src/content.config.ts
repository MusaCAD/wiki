import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

/** A release version as the engine prints it: `0.8.0`. */
const releaseVersion = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'must be a release version such as 0.8.0 (no leading v)');

/**
 * Every page carries these. They are what the status banner, the staleness check and the
 * tier guard read. Build fails on a page without them (§5 of the brief).
 */
export const wikiFrontmatter = z.object({
  /** A short description is required on every page: search results, cards and social previews read it. */
  description: z.string().min(20, 'description: write at least a sentence'),
  /** Who owns the words. generated: nobody edits by hand. assisted: an agent drafts, a human merges. human: left alone by automation. */
  tier: z.enum(['generated', 'assisted', 'human']),
  /** The engine release the page was last checked against. */
  appliesTo: releaseVersion,
  /** When a person last verified the page against that release. */
  lastVerified: z.coerce.date(),
  /** Honest coverage: complete, partial (says what is missing), or stub (header data only). */
  status: z.enum(['complete', 'partial', 'stub']),
  /** The page shape. Drives the components and the frontmatter rules below. */
  kind: z
    .enum([
      'landing',
      'guide',
      'command',
      'sysvar',
      'shortcuts',
      'tutorial',
      'troubleshooting',
      'release',
      'reference',
      'developer',
      'project',
    ])
    .default('guide'),
  /** For kind: command — the registry name, upper case, e.g. LINE. */
  command: z.string().regex(/^-?[A-Z0-9]+$/).optional(),
  /** For kind: sysvar — the variable name, upper case. */
  sysvar: z.string().regex(/^[A-Z0-9]+$/).optional(),
  /** Which platforms the page applies to; omitted means all. */
  platforms: z.array(z.enum(['windows', 'linux', 'macos'])).optional(),
  /** For kind: tutorial. */
  tutorial: z
    .object({
      level: z.enum(['beginner', 'intermediate', 'advanced']),
      /** e.g. "20 minutes" */
      time: z.string(),
      /** The example id under examples/ whose rendered image opens the page and whose file is offered for download. */
      example: z.string().optional(),
    })
    .optional(),
  /** For kind: troubleshooting — the symptom-first fields. */
  symptom: z
    .object({
      /** Who it affects: platforms and versions, in words. */
      affects: z.string(),
      /** The cause, in one sentence. */
      cause: z.string(),
    })
    .optional(),
  /** For pages rendered from a file in the engine repo at build time (ARCHITECTURE.md, ROADMAP.md). */
  sourceOf: z.string().optional(),
  /** For screenshots that are manual assets: the version they were captured with. Rendered figures carry their own stamp. */
  capturedWith: releaseVersion.optional(),
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
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: wikiFrontmatter }) }),
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
          'mc.footer.content': z.string(),
          'mc.footer.examples': z.string(),
          'mc.footer.engine': z.string(),
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
