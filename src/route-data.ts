import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { getCollection } from 'astro:content';
import { ENGINE, STALENESS, reportUrl } from '../wiki.config.mjs';

/** What the overrides read from `Astro.locals.starlightRoute.wiki`. */
export interface WikiRouteData {
  appliesTo: string;
  current: string;
  /** Releases published after `appliesTo`; null when `appliesTo` is not a known release. */
  behind: number | null;
  level: 'ok' | 'warn' | 'fail';
  status: 'complete' | 'partial' | 'stub';
  tier: 'generated' | 'assisted' | 'human';
  kind: string;
  lastVerified: Date;
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
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const currentIndex = releases.findIndex((r) => r.version === ENGINE.version);
  const pageIndex = releases.findIndex((r) => r.version === data.appliesTo);
  const behind = pageIndex < 0 || currentIndex < 0 ? null : pageIndex - currentIndex;
  const level: WikiRouteData['level'] =
    behind === null
      ? 'warn'
      : behind >= STALENESS.failAfter
        ? 'fail'
        : behind >= STALENESS.warnAfter
          ? 'warn'
          : 'ok';

  const pagePath = context.url.pathname;
  (route as typeof route & { wiki: WikiRouteData }).wiki = {
    appliesTo: data.appliesTo ?? '',
    current: ENGINE.version,
    behind,
    level,
    status: data.status ?? 'stub',
    tier: data.tier ?? 'human',
    kind: data.kind ?? 'guide',
    lastVerified: data.lastVerified ?? new Date(0),
    reportUrl: reportUrl(pagePath, data.appliesTo),
    pagePath,
  };
});
