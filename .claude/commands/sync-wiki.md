---
# SPDX-License-Identifier: LGPL-3.0-or-later
# Copyright (C) 2026 Pranay Kiran
description: Draft the written-page updates for a Musa CAD release sync, for a person to review
argument-hint: "<pull request number> | --since <git ref>"
---

Draft updates to the wiki's written pages after Musa CAD changed, and push them for review.

Input: $ARGUMENTS
- A pull request number: a sync pull request opened by `.github/workflows/sync-engine.yml`. Check out its branch (`gh pr checkout <n>`); its description is the change report.
- `--since <ref>`: no pull request. Compare `src/data/wiki-data.json` at `<ref>` with the current one, create a branch `sync/manual-<date>`, and write the report the same way `scripts/sync-release.mjs` does.

## What you may change

Every page's frontmatter has a `tier`. Obey it without exception:

- `generated`: never edit by hand. Run `node scripts/generate-reference.mjs` instead.
- `assisted`: you may update these. Keep the page's structure. Set `appliesTo` to the new release and `lastVerified` to today. Set `status` honestly.
- `human`: do not edit. List each one in the pull request under "Needs its author", with what changed and why it matters.

To give a command page a written body for the first time, change its `tier` from `generated` to `assisted` and its `status` to `partial` or `complete`, then write below the frontmatter. Only do this for commands whose behaviour you have checked (see below).

## How to check facts

- The application's own data is the truth: `src/data/wiki-data.json` holds each command's aliases, description, first prompt or the window it opens, and ribbon locations. Prompts you quote must match it, or the running program (`musacad --dump-wiki-data -`, or start the command in Musa CAD).
- Read Musa CAD's source for behaviour: `src/command/commands.cpp` (prompts and options), `docs/COMMANDS.md`, `CHANGELOG.md`, and the release notes in `docs/release-notes/`.
- Never use Autodesk's documentation, and never paraphrase it. If you cannot describe a command from Musa CAD's own source, prompts and behaviour, leave the page as a stub.
- A plausible description you did not verify is worse than a stub. When unsure, leave `status: stub`.

## How to write

- Write as the developer talking to users: plain, short sentences in everyday English. Say what the reader can do, then how. End with where to go next.
- Prompts go in a ` ```musacad ` block, copied exactly.
- A command page body, when written: what the command is for in one sentence; the prompt sequence; each option in a table; a worked example; notes and gotchas; differences from AutoCAD, stated plainly; where to go next.
- Every file keeps its SPDX-License-Identifier and copyright lines.

## Finish

1. Run `npm run check:headers`, `npm run check:pages`, `npm run build` and `npm run check:links`. Fix anything they report.
2. Commit with a plain message describing the change. Do not add any co-author or AI attribution line to commits, pull requests or files; this is the organisation's policy. Add the line `Wiki-Sync: automated` to the commit message, so CI applies the rules for automated changes.
3. Push to the same branch. Add a comment to the pull request listing what you drafted, what you left as stubs and why, and the human pages that need their author.
4. Never merge. A person reviews and merges.
