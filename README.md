# Musa CAD Wiki

The documentation for [Musa CAD](https://musacad.org), published at
[wiki.musacad.org](https://wiki.musacad.org). Astro + Starlight; content in MDX under
`src/content/docs/`; everything that can be generated from the application is generated.

## Working on it

```sh
npm ci                 # Node 24 (see .nvmrc)
npm run dev            # http://localhost:4321
npm run build          # renders the examples with the pinned engine, then builds dist/
npm run verify         # contrast → staleness → build → links → accessibility/performance gates
```

`npm run build` downloads the pinned Musa CAD release (`wiki.config.mjs`, `ENGINE.version`)
into `.cache/engine/` on first run and plots every drawing in `examples/` with it; the
illustrations on the pages come from the application itself. It needs `pdftocairo`
(poppler-utils) and, for the AppImage, `libfuse2` or nothing (it extracts and runs).

## The rules every page follows

Every page's frontmatter carries `tier`, `appliesTo`, `lastVerified` and `status`
(`src/content.config.ts` rejects a page without them). `status` is honest coverage:
`complete`, `partial` or `stub`. A page behind the pinned release shows a banner; three
releases behind fails the build (`scripts/check-staleness.mjs`).

- **generated** pages are written by the sync from the application's own data. Nobody edits them by hand.
- **assisted** pages are drafted from the release diff and reviewed by a person before they land.
- **human** pages are written by people; automation may flag them, never rewrite them.

Nothing on any page is derived from Autodesk's documentation. Command pages are written from
Musa CAD's source, its prompts and testing. See `NOTES.md`, `DECISIONS.md` and `PROGRESS.md`
for how the wiki was built and where it is.

## Licences

Content CC BY-SA 4.0; code samples and example drawings CC0; the wiki's code MIT. Musa CAD
itself is LGPL-3.0-or-later. See `LICENSE`.
