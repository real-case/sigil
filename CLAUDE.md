# CLAUDE.md — Project Instructions for Sigil

This file provides repository-level guidance for Claude Code when working in this codebase. Read it before making changes.

## Project at a glance

Sigil is an MCP Apps server that ships interactive chart widgets (11 of them — bar / line / pie / table / scatter / treemap / heatmap / stat-panel / sankey / dashboard / map) which render inline inside AI hosts (Claude Desktop, Claude web, VS Code Copilot, etc.). The user-facing overview is in [`README.md`](./README.md); [`SPEC.md`](./SPEC.md) is the original build plan, kept as a design record.

Key entry points:

- `src/server.ts` — HTTP transport (Express + StreamableHTTPServerTransport)
- `src/stdio.ts` — stdio transport (for `npx sigil` in Claude Desktop / VS Code)
- `src/registry.ts` — single source of truth for the widget set (server tools, build pipeline, UI resources)
- `src/widgets/<name>/App.tsx` — per-widget React entry; bundled to a single-file HTML by Vite + `vite-plugin-singlefile`
- `src/widgets/shared/widget-shell.tsx` — `mountWidget` HOC that handles payload guarding, status, and `app.ontoolresult` plumbing for every widget

## Rules

### Documentation language

- **All Markdown (`.md`) files in this repository must be written in English** — including, but not limited to, `README.md`, `SPEC.md`, `TESTING.md`, `CLAUDE.md`, and anything under `specs/`.
- This rule applies to prose, headings, code-block comments, table contents, and inline examples.
- The rule also covers **`.mdx` Storybook documentation** under `src/stories/` — they are documentation in the same spirit and must be written in English.
- **Exception:** a Markdown file may contain non-English content only when it is *feature data* — i.e. text that exists because the product itself recognises or emits it. The exception must be declared explicitly in a note at the top of that file, naming this rule and the reason.
- Current sanctioned exception: [`INCANTATIONS.md`](./INCANTATIONS.md), which documents Russian-language ritual trigger phrases as part of Sigil's optional ritual-mode preset.
- Untranslated Markdown checked in without an explicit exception note should be flagged and translated.

### Other conventions

- Don't propose bundle-size optimisations unprompted. Widgets ship as self-contained single-file HTML (the MCP Apps constraint), so inlining Recharts, TopoJSON atlases, and fonts into every widget is intentional — portability beats kilobytes here.
- Adding a widget is mostly new files, but a few existing lists need entries too — the registry pattern shrinks that set, it does not empty it. Add the widget to `src/registry.ts` first, then run `npm test`: every list that has to track the registry is pinned by a test that fails naming the widget that is missing, so the suite tells you what to edit next.
- Two exceptions no test will mention, so they are on you: the sandbox dataset registry (`src/widgets/sandbox/datasets/index.ts` — both its `WidgetKey` union and `WIDGET_ENTRIES`), and the widget counts in `README.md` and at the top of this file.

### Linting

- Biome lints; it does **not** format. `formatter` and `assist` are off in `biome.json` on purpose — the codebase is already consistent, and enabling either rewrites ~124 of 143 files for no correctness gain while flattening hand-placed line breaks.
- Only the `correctness`, `suspicious` and `performance` presets are on. `style` and `complexity` are off because their defaults fight deliberate choices here: `useLiteralKeys` would rewrite the guards' `v["label"]` bracket access, which exists to satisfy `noUncheckedIndexedAccess`, and `noNonNullAssertion` would flag the `!` the tests use on known-present fixtures.
- `a11y` is on. Chart marks that respond to a click are keyboard-reachable through `src/widgets/shared/roving-focus.ts`: the marks of one chart form a single composite widget — one mark holds the tab stop, the arrow keys move it, Enter/Space does what a click does. Adding a new clickable mark means giving it a role, an `aria-label`, and a place in that sequence, not a suppression.
- The one a11y rule that needs suppressing is `useSemanticElements` inside `<svg>`: it answers `role="grid"`/`row`/`gridcell`/`button` with "use `<table>`/`<tr>`/`<td>`/`<button>`", and none of those elements can exist in SVG. Suppress it there with that reason. It is not a licence to suppress the rule on HTML, where the advice is sound.
- Name a hand-written chart `<svg>` with a plain `aria-label` derived from the payload, never `role="img"` — `role="img"` prunes the marks inside it out of the accessibility tree. `role="img"` plus `aria-label` is right only for a picture with nothing reachable inside, such as the stat-panel sparkline. Decorative glyphs take `aria-hidden="true"`; the bare JSX `aria-hidden` shorthand does not satisfy the rule.
- A suppression must be a single `// biome-ignore lint/<group>/<rule>: reason` line immediately above the offending line. Prose on following lines breaks the attachment and the rule fires anyway — silently, since Biome only reports *unused* suppressions.

### Branch & release workflow

- `dev` is the default branch — branch from it and target it with every PR (features, fixes, dependabot).
- `main` is release-only: never commit or push to it directly. It moves via `dev` → `main` release PRs merged with a **merge commit** (a ruleset enforces PR-only, a green `verify` check, and merge-commit-only).
- A release is a manually pushed `vX.Y.Z` tag on `main` matching `package.json` — `.github/workflows/release.yml` then publishes `@real-case/sigil` to npm (OIDC trusted publishing, no token) and creates the GitHub Release. Do not bump versions or push tags unless explicitly asked.
- Hotfixes: branch off `main`, PR back to `main`, tag, then back-merge `main` → `dev` with a PR.

## Useful commands

```bash
npm run dev          # HTTP server on :3001 (Claude web via cloudflared)
npm run dev:stdio    # stdio server (Claude Desktop / VS Code)
npm run dev:sandbox  # in-browser sandbox: pick any widget + preset dataset, toggle theme/viewport/debug overlay (src/widgets/sandbox)
npm run dev:storybook    # Storybook 10 widget catalog on :6006 (autodocs + dataset-driven stories, theme/viewport toolbars)
npm run typecheck    # tsc --noEmit
npm run lint         # biome lint (correctness/suspicious/performance only — see below)
npm run lint:fix     # same, applying the safe fixes
npm run build        # bundle widgets + compile server
npm run build:storybook  # static catalog to storybook-static/ (gitignored)
```
