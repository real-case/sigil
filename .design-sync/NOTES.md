# design-sync notes — Sigil

Repo-specific gotchas for syncing Sigil's widgets to claude.ai/design. Read
before re-syncing.

## Why this repo is unusual

Sigil is an **MCP Apps server**, not a component library. `npm run build`
produces a *server* `dist/` + standalone widget HTML — there is **no compiled
component `dist/` exporting React components on a global**. So the converter
can't auto-discover an entry.

- **`.design-sync/entry.tsx`** is a hand-authored bundle entry (committed). It
  re-exports each widget's presentational `*View` component under its real name
  and is passed via `--entry`. esbuild compiles it from source (TSX, `.js`
  import specifiers rewrite to `.ts`/`.tsx`).
- **The `*View` names must stay exact.** The Storybook compare harness redirects
  a story's relative `./<Name>View.js` import to `window.Sigil.<Name>View` by
  matching the file basename against the bundle's exports (`exportedComponentFor`
  in `lib/story-imports.mjs`). Renaming the exports breaks that redirect and the
  previews would render a duplicate source copy with broken React context.
- **`extraEntries: ["./.design-sync/entry.tsx"]`** is required *in addition* to
  `--entry`. The storybook shape gates discovered components against the
  package's `.d.ts` public exports (`exportedNames`), which is **empty** here (no
  built types). A path-form `extraEntries` entry is source-scanned for its
  `export { … }` names and those are added to the gate's export set. Must start
  with `./` (a bare `.design-sync/…` is treated as a node_modules package and
  fails). esbuild dedupes the doubly-listed entry, so recharts is not bundled
  twice.
- **`titleMap`** maps each whitespace-stripped Storybook title segment
  (`"Bar chart"` → `Barchart`) to the export name (`BarChartView`).

## Theming → provider + static tokens

Sigil themes at runtime: `.storybook/preview.tsx` calls `installThemeStyles()`
(injects base `--sigil-*` tokens onto an unconditional `:root`) and applies the
`@storybook/addon-themes` `withThemeByDataAttribute` decorator.

- **The addon-themes decorator can't be bundled for static previews.** esbuild's
  `__toESM` interop enumerates the inert stub's *own* keys, so
  `withThemeByDataAttribute` resolves to `undefined` → every preview threw
  `TypeError: … is not a function`. Fix: **`cfg.provider` =
  `SigilThemeProvider`** (defined in `entry.tsx`), which runs
  `installThemeStyles()` in a lazy `useState` initializer and renders children.
  Setting `cfg.provider` makes the converter skip decorator bundling entirely.
- **Tokens must also ship statically** — designs receive only the `styles.css`
  `@import` closure (no runtime JS), so runtime-injected tokens wouldn't reach
  them. **`cfg.cssEntry` = `.design-sync/styles-bundle.css`**, a generated file
  that inlines BOTH the `--sigil-*` tokens (`renderThemeCss()` from
  `src/widgets/shared/theme.ts`) AND the component chrome styles
  (`src/widgets/shared/styles.css`, plain self-contained CSS). It can't be a
  `tokensGlob` (that only globs inside a `tokensPkg` npm package) and can't be
  two files (cssEntry that already exists suppresses the storybook CSS scrape).

  Regenerate `styles-bundle.css` whenever `theme.ts` tokens or
  `shared/styles.css` change:
  ```sh
  npx tsx -e 'import {renderThemeCss} from "./src/widgets/shared/theme.ts";import {readFileSync,writeFileSync} from "node:fs";writeFileSync(".design-sync/styles-bundle.css","/* tokens */\n"+renderThemeCss()+"\n\n/* component styles */\n"+readFileSync("./src/widgets/shared/styles.css","utf8"))'
  ```

## Fonts

`[FONT_REMOTE]` — IBM Plex Sans / IBM Plex Mono load via a Google Fonts
`@import url(...)` already present in the scraped storybook CSS (and committed in
the repo). The host serves them at runtime; nothing to ship. The `"uppercase"` /
`"tabular-nums"` families in the warning are false positives (font-feature /
text-transform token values parsed as family names) — ignore.

## Build / re-sync commands

No component build step is needed (esbuild compiles `entry.tsx` from source).
Re-sync still must rebuild the reference storybook (DS source changed):
```sh
npx storybook build -c .storybook -o "$(git rev-parse --show-toplevel)/.design-sync/sb-reference"
```

## Re-sync risks (watch-list)

- **`styles-bundle.css` is a snapshot** of `theme.ts` tokens + `shared/styles.css`.
  It does NOT auto-regenerate — if either source changes, designs/previews go
  stale until you re-run the generator above. (entry.tsx's `SigilThemeProvider`
  keeps previews correct via runtime injection, so a stale styles-bundle.css
  would silently desync only the *static* design closure — check a token value.)
- **Dark theme** ships via the `@media (prefers-color-scheme: dark)` block in the
  tokens; previews/designs follow OS preference. The Storybook `data-sigil-theme`
  forced-theme override is dev-only and intentionally NOT shipped.
- **Story cap**: charts have up to 7 stories; captured with `--max-stories 7`.
  Tail stories beyond a future default cap are verified-by-upload, not
  individually graded.
- Adding a new widget: add its `*View` export to `entry.tsx` and a `titleMap`
  entry; everything else is automatic. Both halves are pinned against the
  registry by `src/__tests__/design-sync-config.test.ts`, so a forgotten one
  fails `npm test` rather than silently shipping a widget the bundle has no
  export for (that happened with `sankey`, which had the `titleMap` entry but
  no `entry.tsx` export — the compare harness would have rendered a duplicate
  source copy for it). `tsc` does not cover `entry.tsx`, so the same test also
  resolves each export's import path.
