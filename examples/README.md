# Example drawings

Every `.musa` here is plotted by the pinned Musa CAD release at build time
(`scripts/render-examples.mjs`) and embedded by `<Figure id="...">`. A drawing that stops
plotting fails the build.

- `<id>.musa` — the drawing. Written for the wiki; **CC0** (see LICENSE).
- `<id>.plotargs` — optional, one line of `musacad --plot` options for the render
  (default `--paper A4 --landscape`).

The files use the native text format. Older format versions load in every newer release, so an
example written in a simple early version keeps rendering across releases; the version the
file declares is the version it was written in, not the version it was last rendered with.
