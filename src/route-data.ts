// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { getCollection } from 'astro:content';
import { ENGINE, STALENESS, compareVersions, reportUrl } from '../wiki.config.mjs';

/** What the component overrides read from `Astro.locals.starlightRoute.wiki`. */
export interface WikiRouteData {
  /** False for pages without a file of their own (the blog's index, tag and author pages). */
  tracked: boolean;
  appliesTo: string;
  current: string;
  /** Releases published after `appliesTo`; null when it is not a release the wiki knows. */
  behind: number | null;
  level: 'ok' | 'warn' | 'fail';
  status: 'complete' | 'partial' | 'stub' | null;
  tier: 'generated' | 'assisted' | 'human' | null;
  kind: string;
  lastVerified: Date | null;
  reportUrl: string;
  pagePath: string;
}

export const onRequest = defineRouteMiddleware(async (context) => {
  const route = context.locals.starlightRoute;
  const data = route.entry.data as typeof route.entry.data & {
    appliesTo?: string;
    status?: WikiRouteData['status'];
    tier?: WikiRouteData['tier'];
    kind?: string;
    lastVerified?: Date;
  };

  const releases = (await getCollection('releases'))
    .map((r) => r.data)
    .sort((a, b) => compareVersions(b.version, a.version)); // newest first
  const currentIndex = releases.findIndex((r) => r.version === ENGINE.version);
  const tracked = Boolean(data.appliesTo);
  const pageIndex = releases.findIndex((r) => r.version === data.appliesTo);
  const behind = !tracked || pageIndex < 0 || currentIndex < 0 ? null : pageIndex - currentIndex;
  const kind = data.kind ?? 'guide';
  // A blog post is dated history: it says what was true when it was written, so it never
  // carries the "checked against an older release" banner.
  const level: WikiRouteData['level'] =
    !tracked || kind === 'blog'
      ? 'ok'
      : behind === null
        ? 'warn'
        : behind >= STALENESS.failAfter
          ? 'fail'
          : behind >= STALENESS.warnAfter
            ? 'warn'
            : 'ok';

  const pagePath = context.url.pathname;
  (route as typeof route & { wiki: WikiRouteData }).wiki = {
    tracked,
    appliesTo: data.appliesTo ?? '',
    current: ENGINE.version,
    behind,
    level,
    status: data.status ?? null,
    tier: data.tier ?? null,
    kind,
    lastVerified: data.lastVerified ?? null,
    reportUrl: reportUrl(pagePath, data.appliesTo),
    pagePath,
  };
});
