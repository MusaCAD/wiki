<!-- SPDX-License-Identifier: LGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Pranay Kiran -->

# Musa CAD Wiki

The documentation for [Musa CAD](https://musacad.org), published at
[wiki.musacad.org](https://wiki.musacad.org). Built with Astro and Starlight. Pages are MDX
files under `src/content/docs/`.

## Working on it

You need Node 24 and `pdftocairo` (from `poppler-utils`).

```sh
npm ci
npm run dev        # http://localhost:4321
npm run build      # plots the example drawings with Musa CAD, then builds dist/
npm run verify     # every check CI runs, then the build and the accessibility audit
```

The first build downloads the Musa CAD release the wiki is pinned to (`ENGINE` in
`wiki.config.mjs`) into `.cache/engine/` and uses it to plot every drawing in `examples/`.
The pictures of drawings on the pages are made by Musa CAD itself, so they always match.

## Where the facts come from

Command pages, system variable pages, the keyboard shortcuts, the ribbon map and the
command line options are not typed by hand. They come from Musa CAD itself:

```sh
npm run sync       # runs `musacad --dump-wiki-data` and reads the git tags, then regenerates pages
# or, with a particular build and source checkout:
node scripts/sync-engine.mjs --engine path/to/musacad_app --src path/to/MusaCAD
node scripts/generate-reference.mjs
```

| File | Made by | What it holds |
|---|---|---|
| `src/data/wiki-data.json` | `musacad --dump-wiki-data` | every command, its aliases, first prompt, the ribbon, shortcuts |
| `src/data/command-origins.json` | the Musa CAD git tags | the release each command arrived in |
| `src/data/format-history.json` | comments in the Musa CAD source | what each `.musa` format version added |
| `src/data/releases.json` | by hand, once per release | release dates, format versions, downloads |

Some pages are the developers' own documents from the Musa CAD repository, shown as they are
at the pinned release: the architecture, the roadmap, the third-party components, the command
status table, the AutoCAD settings status and every release's notes. `npm run docs` (also run
before `dev`, `build` and `check`) writes them from a local checkout at `../musa_cad`, or from
GitHub at the pinned tag. They are not committed; edit them in the Musa CAD repository.

## Who writes which page

Every page's frontmatter says who owns its words (`tier`), the release it was last checked
against (`appliesTo`), when (`lastVerified`), and how complete it is (`status`):

- **generated:** written by `scripts/generate-reference.mjs`. Never edit one by hand; CI
  regenerates them and fails if they differ. To write a command page, change its `tier` to
  `assisted` or `human`, set `status`, and write below the frontmatter. The generator then
  leaves it alone.
- **assisted:** drafted from a release's changes, then read and corrected by a person.
- **human:** written by a person. Automation may flag it as out of date, never rewrite it.

A page shows a note at the top when it is behind the newest release. Three releases behind
fails the build (`scripts/check-staleness.mjs`).

## Writing

- Plain, short sentences. Say what the reader can do, then how. End with where to go next.
- Prompts go in a ` ```musacad ` block, copied from Musa CAD. They are shown the way the
  command line shows them.
- Every image needs alt text. Drawings are `<Figure id="...">` with a file in `examples/`;
  screenshots are `<Screenshot capturedWith="0.8.0">`.
- Nothing may come from Autodesk's documentation. Write from Musa CAD's own source, its
  prompts, and what it does when you use it.
- Every file starts with the `SPDX-License-Identifier` and copyright lines
  (`npm run check:headers`).

## Checks

`npm run verify` runs them all: licence headers, page fields and coverage (every command
has a page), colour contrast in both themes, staleness, the build, links and anchors, and
the accessibility, keyboard, layout and Lighthouse gates.

## For AI tools and search engines

The site publishes `/llms.txt` (every page with a summary), `/llms-full.txt` (the text of
every page) and `/data/commands.json` (every command and variable as data), plus schema.org
structured data on every page.

## Licence

LGPL-3.0-or-later, the same as Musa CAD. The example drawings and code samples are also
CC0, so they can be used without credit. See `LICENSE`.
