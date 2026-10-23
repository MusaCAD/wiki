// One place for every value that would otherwise be scattered: the public URL, the
// pinned engine release, repository links, locales and the staleness policy.
// Plain ESM so astro.config.mjs, build scripts and components can all import it.

/** The wiki's public origin. Moving to musacad.org/wiki is SITE_URL + BASE here, nothing else. */
export const SITE_URL = 'https://wiki.musacad.org';
export const BASE = '/';

/** The engine release the wiki is built against: pinned binary for renders, default `appliesTo`. */
export const ENGINE = {
  version: '0.8.0',
  tag: 'v0.8.0',
  repo: 'https://github.com/MusaCAD/MusaCAD',
  /** Release asset names the wiki knows how to run headlessly, by platform. */
  appimage: (v) => `MusaCAD-${v}-x86_64.AppImage`,
  releaseUrl: (tag) => `https://github.com/MusaCAD/MusaCAD/releases/tag/${tag}`,
  downloadUrl: (tag, asset) => `https://github.com/MusaCAD/MusaCAD/releases/download/${tag}/${asset}`,
};

export const WIKI_REPO = 'https://github.com/MusaCAD/wiki';
export const SITE_HOME = 'https://musacad.org';
export const FLATHUB_URL = 'https://flathub.org/apps/org.musacad.MusaCAD';
export const FLATPAK_ID = 'org.musacad.MusaCAD';

/**
 * Locales. `root` is English and always on. Others are routed the moment `enabled` is true;
 * until then they are structure only, so a half-translated wiki is never published.
 */
export const LOCALES = {
  root: { label: 'English', lang: 'en', enabled: true },
  hi: { label: 'हिन्दी', lang: 'hi', enabled: false },
  te: { label: 'తెలుగు', lang: 'te', enabled: false },
};

/** Staleness policy, in releases behind the pinned engine: warn at 1, fail the build at 3. */
export const STALENESS = { warnAfter: 1, failAfter: 3 };

/** Where "Report a problem with this page" goes. Query fields match the issue form's ids. */
export const reportUrl = (pagePath, appliesTo) =>
  `${WIKI_REPO}/issues/new?template=page-problem.yml&title=${encodeURIComponent(`Page problem: ${pagePath}`)}&page=${encodeURIComponent(SITE_URL + pagePath)}&version=${encodeURIComponent(appliesTo ?? '')}`;
