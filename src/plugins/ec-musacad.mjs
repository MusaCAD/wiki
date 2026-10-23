// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright (C) 2026 Pranay Kiran

// Expressive Code plugin: a ```musacad fence renders as Musa CAD's command line.
//
// Lines are read with the conventions the application's own prompts use:
//   Command: LINE                              prompt + what was typed
//   Specify next point or [Close/Undo]: @100,0 prompt, [options], typed input
//   Specify radius of circle or [Diameter] <12.0000>: ↵    <default>, Enter
//   12 found                                   an echo from the application
//
// Colouring is done here, not by a syntax theme, so the block looks like the application's
// command line in both wiki themes (dark field, green prompt). The grammar registered with
// Shiki is a plain-text one: it exists only so the language is known and the build stays
// warning-free.
import { definePlugin } from 'astro-expressive-code';

export const musacadGrammar = {
  name: 'musacad',
  scopeName: 'source.musacad',
  patterns: [{ match: '^.*$', name: 'text.musacad' }],
  repository: {},
};

const text = (value) => ({ type: 'text', value });
const span = (className, children) => ({
  type: 'element',
  tagName: 'span',
  properties: { className: [className] },
  children,
});

/** Turn one line of a prompt block into hast nodes. */
function renderLine(line) {
  if (line.trim() === '') return [text(line)];
  // `Command: LINE`
  const cmd = /^(Command:)(\s*)(.*)$/.exec(line);
  if (cmd) {
    return [span('mc-prompt', [text(cmd[1])]), text(cmd[2]), ...renderInput(cmd[3])];
  }
  // `prompt words [Options] <default>: typed`
  const m = /^(.*?)(\s*\[[^\]]*\])?(\s*<[^>]*>)?(:)( ?)(.*)$/.exec(line);
  if (m && m[1].trim() !== '' && !m[1].startsWith('<')) {
    const out = [span('mc-prompt', [text(m[1])])];
    if (m[2]) out.push(span('mc-option', [text(m[2])]));
    if (m[3]) out.push(span('mc-default', [text(m[3])]));
    out.push(span('mc-prompt', [text(m[4])]));
    out.push(text(m[5]));
    out.push(...renderInput(m[6]));
    return out;
  }
  return [span('mc-echo', [text(line)])];
}

/** What was typed at the prompt. `↵` is shown as the Enter key, `⎋` as Esc. */
function renderInput(s) {
  if (s === '') return [];
  const parts = s.split(/(↵|⎋)/);
  return parts
    .filter((p) => p !== '')
    .map((p) =>
      p === '↵'
        ? span('mc-key', [text('Enter')])
        : p === '⎋'
          ? span('mc-key', [text('Esc')])
          : span('mc-input', [text(p)])
    );
}

function findByClass(node, className) {
  if (!node || typeof node !== 'object') return null;
  const cls = node.properties?.className;
  if (Array.isArray(cls) ? cls.includes(className) : cls === className) return node;
  for (const child of node.children ?? []) {
    const hit = findByClass(child, className);
    if (hit) return hit;
  }
  return null;
}

export function musacadCommandLine() {
  return definePlugin({
    name: 'Musa CAD command line',
    hooks: {
      preprocessMetadata: ({ codeBlock }) => {
        if (codeBlock.language !== 'musacad') return;
        if (!codeBlock.props.title) codeBlock.props.title = 'Command line';
      },
      postprocessRenderedLine: ({ codeBlock, line, renderData }) => {
        if (codeBlock.language !== 'musacad') return;
        const target = findByClass(renderData.lineAst, 'code') ?? renderData.lineAst;
        target.children = renderLine(line.text);
      },
      postprocessRenderedBlock: ({ codeBlock, renderData }) => {
        if (codeBlock.language !== 'musacad') return;
        const frame = findByClass(renderData.blockAst, 'frame');
        if (frame) {
          const cls = frame.properties.className;
          frame.properties.className = Array.isArray(cls) ? [...cls, 'mc-cmd'] : [cls, 'mc-cmd'];
        }
      },
    },
  });
}
