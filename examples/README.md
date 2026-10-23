<!-- SPDX-License-Identifier: LGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Pranay Kiran -->

# Example drawings

Every `.musa` here (and every `.py` program that writes one) is plotted by the pinned Musa CAD release at build time
(`scripts/render-examples.mjs`) and embedded by `<Figure id="...">`. A drawing that stops
plotting fails the build.

- `<id>.musa` — the drawing, or `<id>.py` — a program that writes it (run as `python3 -I <id>.py <out.musa>`). Also CC0 (see LICENSE).
- `<id>.plotargs` — optional, one line of `musacad --plot` options for the render
  (default `--paper A4 --landscape`).

The files use the native text format. Older format versions load in every newer release, so an
example written in a simple early version keeps rendering across releases; the version the
file declares is the version it was written in, not the version it was last rendered with.
