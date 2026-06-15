# Task: Storybook (latest, v10) — widget documentation & visual catalog
Type: feature
Created: 2026-06-09
Status: ready

> **Supersedes** the 2026-06-07 `draft` of this file. Three changes from that draft:
> 1. **Version target raised to the latest line — Storybook 10.4.2** (the draft conservatively targeted 8.x for "React 18 + Vite 5 compatibility"; that caution is now obsolete — see Context → Dependencies). All config/code samples are rewritten to the v10 API.
> 2. **Scope fixed to Phase 1 only** (local catalog & docs). Visual regression and Pages deploy move wholesale to Future Considerations.
> 3. **Open Decisions resolved:** Phase 1 only · all 4 MDX pages · Chromatic recorded as the chosen backend *for the future Phase 2* (not in scope here).

## Goal

Add [Storybook](https://storybook.js.org/) **10** as the project's component documentation and visual catalog for the widget set. The deliverable is a browsable, locally-runnable (`npm run dev:storybook`) and statically-buildable (`npm run build:storybook`) catalog that documents every one of the 7 widgets — its payload API via autodocs, and its rendered states across the existing dataset taxonomy — under light/dark themes and a set of viewport presets, fronted by four narrative MDX pages.

The work **reuses, not replaces**, the existing in-browser sandbox (`src/widgets/sandbox`) and its curated dataset catalog. The sandbox datasets remain the single source of truth for widget payloads; stories consume them by id — no payload literals are duplicated into story files.

## Context

### Why Storybook fits this codebase already

- Every widget View is a pure `ComponentType<{ payload: P }>` decoupled from the MCP transport — all `useApp`/`ontoolresult` plumbing lives in `mountWidget` (`src/widgets/shared/widget-shell.tsx`). Storybook needs exactly this: isolated render from props. **No View changes required.** (Verified: `BarChartView` in [src/widgets/bar-chart/BarChartView.tsx](src/widgets/bar-chart/BarChartView.tsx) takes `{ payload: BarChartPayload }`.)
- `src/widgets/sandbox/datasets/` already encodes a deliberate state taxonomy (`minimal / small / medium / large / edgeLabels / negatives / multiSeries / nested` — see [types.ts](src/widgets/sandbox/datasets/types.ts)) whose thresholds bracket the heuristic boundaries in render code (e.g. `BarChartView`'s `ROTATE_AFTER_ITEMS = 6`). This is, in effect, a hand-authored story set — stories map onto it 1:1.
- `src/widgets/shared/theme.ts` exports `installThemeStyles()` and `renderForcedThemeCss()`, and keys a forced theme off `<html data-sigil-theme="…">` (see [theme.ts:512](src/widgets/shared/theme.ts)). This is the exact contract `@storybook/addon-themes`' `withThemeByDataAttribute` decorator drives — the theme toggle wires up with **no new theming code**. The sandbox's [App.tsx](src/widgets/sandbox/App.tsx) already shows the one-time injection pattern the preview file mirrors.

### Affected files

**New:**

- `.storybook/main.ts` — framework config via `defineMain` (`@storybook/react-vite`), stories glob, addon list. No `viteFinal` unless a concrete alias/plugin need arises.
- `.storybook/preview.tsx` — global decorators (theme), parameters (viewport presets, layout), one-time `installThemeStyles()` + forced-theme CSS injection.
- `src/widgets/<name>/<Name>.stories.tsx` × 7 — one story file per widget (bar-chart, line-chart, pie-chart, table, scatter-chart, heatmap, treemap), each sourcing payloads from the sandbox datasets by id.
- `src/widgets/shared/storybook/from-datasets.ts` — small helper turning a `Dataset<P>[]` + id into a typed payload; centralises the `noUncheckedIndexedAccess` guard.
- `src/stories/Introduction.mdx` — landing page: what Sigil is, the MCP-Apps context, how to read the catalog.
- `src/stories/DesignTokens.mdx` — design-token / palette reference (subsumes the purpose of the dev-only `palette-preview` widget).
- `src/stories/Theming.mdx` — light/dark token model and the `data-sigil-theme` mechanism.
- `src/stories/McpIntegration.mdx` — how a static View becomes a live MCP widget (`mountWidget`, payload guards, `ontoolresult`), so the catalog explains the gap between "story" and "production".

**Edit:**

- `package.json` — add devDependencies (see below); add `dev:storybook` + `build:storybook` scripts (matching the existing `dev:` / `build:` prefix convention).
- `tsconfig.json` — add `.storybook/**/*` to `include` (currently `["src/**/*.ts", "src/**/*.tsx", "vite.config.ts", "scripts/**/*.ts"]` — `.storybook` lives outside `src/` so it is not yet typechecked). Mirrors how `scripts/**/*.ts` was added for the build script.
- `.gitignore` — ignore `storybook-static/` and `*storybook.log`.
- `CLAUDE.md` — add Storybook commands to "Useful commands"; note that `.mdx` story docs fall under the English-only documentation rule.

### Related patterns

- **Script naming.** `package.json` uses `dev:stdio`, `dev:sandbox`, `build:widgets`, `build:server`. New scripts follow suit: `dev:storybook` (`storybook dev -p 6006`), `build:storybook` (`storybook build`) — rather than Storybook's default bare `storybook` / `build-storybook`.
- **Registry as source of truth.** The sandbox's `WIDGET_ENTRIES` ([src/widgets/sandbox/datasets/index.ts](src/widgets/sandbox/datasets/index.ts)) links View ↔ datasets per widget. Stories deliberately import the *same* dataset arrays (`barDatasets`, `lineDatasets`, …) so there is one payload catalog, not two.
- **Dev-only Vite widgets.** `vite.config.ts` whitelists `palette-preview` and `sandbox` as dev-only via `WIDGET=`, roots into a single `src/widgets/${WIDGET}` dir, and applies `viteSingleFile`. Storybook is a separate dev tool with its own Vite builder — it does **not** go through that `WIDGET=`-rooted config (see Design Notes → Subtleties).
- **`.js` import specifiers.** `moduleResolution: "Bundler"` with `.js` specifiers on relative TS imports (e.g. `./BarChartView.js`). Story files and decorators follow the same convention.

### Dependencies

New **devDependencies** (dev-only; **no production/runtime deps added**). Pin whatever `npx storybook@latest init` resolves; the latest line at spec time is **10.4.2**.

- `storybook` — the unified CLI + core (v10 folds the former `@storybook/addon-essentials` features — controls, actions, viewport, backgrounds, toolbars, measure, outline — into core).
- `@storybook/react-vite` — React + Vite framework + builder; also the source of the `Meta` / `StoryObj` / `Preview` types.
- `@storybook/addon-docs` — autodocs + MDX support (this is the v10 home of what used to be bundled in essentials).
- `@storybook/addon-themes` — provides `withThemeByDataAttribute`.
- `@storybook/addon-a11y` — accessibility panel (a deliberate portfolio signal; informational only in this phase).

**Compatibility (verified against npm at spec time):**

| Constraint | This project | Storybook 10.4.2 requirement | Verdict |
|---|---|---|---|
| Vite | `^5.4.10` | `@storybook/react-vite` peer: `vite ^5 \|\| ^6 \|\| ^7 \|\| ^8` | ✅ supported as-is |
| React | `^18.3.1` | peer: `react ^16.8 \|\| ^17 \|\| ^18 \|\| ^19` | ✅ supported as-is |
| Node (dev) | local v22 | SB10 CLI prefers Node 20+ | ✅ (dev-only; see Design Notes) |

> The draft's worry that the latest line would force a React/Vite bump is unfounded — Storybook 10 supports React 18 + Vite 5 directly. **`@storybook/addon-essentials` is intentionally absent** from the list above: it has no v9/v10 release (it stops at 8.6.x) because its features moved into core.

## Chosen Approach

### Stories: one explicit file per widget, payloads from the dataset catalog

Each widget gets `src/widgets/<name>/<Name>.stories.tsx`. The file imports the View and the widget's dataset array, and emits **one named story per dataset** so autodocs, the args table, and Controls all work. Payloads are read from the sandbox catalog by id through a typed helper — never redefined inline.

`src/widgets/shared/storybook/from-datasets.ts`:

```ts
import type { Dataset } from "../../sandbox/datasets/types.js";

// noUncheckedIndexedAccess is on — a missing id is a real possibility the
// compiler forces us to handle. Throw loudly at story-load time rather than
// rendering `undefined`. This is the sanctioned path; stories must not index
// the dataset array directly or use non-null assertions.
export function payloadById<P>(datasets: Dataset<P>[], id: string): P {
  const found = datasets.find((d) => d.id === id);
  if (!found) {
    throw new Error(`Storybook: dataset id "${id}" not found in catalog`);
  }
  return found.payload;
}
```

`src/widgets/bar-chart/BarChart.stories.tsx` (representative — v10 type import):

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChartView } from "./BarChartView.js";
import { barDatasets } from "../sandbox/datasets/bar.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof BarChartView> = {
  title: "Widgets/Bar chart",
  component: BarChartView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof BarChartView>;

// dataset ids verified against src/widgets/sandbox/datasets/bar.ts
export const MinimalSingle: Story = { args: { payload: payloadById(barDatasets, "bar-minimal-single") } };
export const SmallVertical: Story = { args: { payload: payloadById(barDatasets, "bar-small-vertical") } };
export const EdgeLongLabels: Story = { args: { payload: payloadById(barDatasets, "bar-edge-labels") } };
export const NegativesMixed: Story = { args: { payload: payloadById(barDatasets, "bar-negatives-mixed") } };
// …one line per dataset the widget should showcase
```

Explicit named exports are intentional (see rejected "generated stories"): they give clean autodocs, stable story IDs (important if Chromatic baselines are added in the future Phase 2), and human-readable titles — all serving the documentation goal. Adding a widget still means adding exactly one new `.stories.tsx` file — consistent with the project's "only new files" rule.

### `.storybook/main.ts` — stable CSF 3 `StorybookConfig`, Vite builder, no `WIDGET=` rooting

> **API choice:** use the **stable CSF 3** form (`StorybookConfig` type) throughout, not the experimental CSF Next `defineMain`/`definePreview` (labelled 🧪 in v10 docs). `storybook init` emits the stable form; keeping it avoids shipping a docs tool on an experimental config API. `main.ts` and `preview.tsx` must use the *same* style — do not mix.

```ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../src/stories/**/*.mdx",
    "../src/widgets/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-themes",
    "@storybook/addon-a11y",
  ],
  framework: { name: "@storybook/react-vite", options: {} },
  // Do NOT reuse the repo vite.config.ts: it roots into a single
  // src/widgets/${WIDGET} dir and applies viteSingleFile. Storybook needs to
  // see the whole tree and uses its own builder. Add a viteFinal only if a
  // plugin (e.g. an extra alias) is genuinely required.
};
export default config;
```

### Theme + viewport via global decorators (v10 API)

`.storybook/preview.tsx`:

```tsx
import type { Preview } from "@storybook/react-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import { installThemeStyles, renderForcedThemeCss } from "../src/widgets/shared/theme.js";
import "../src/widgets/shared/styles.css";

// Inject base tokens + the forced-theme override CSS once, exactly as the
// sandbox's App.tsx does. The decorator below flips data-sigil-theme.
// Guard both DOM-touching calls: build:storybook / addon-docs may evaluate
// this module in a Node pass, and installThemeStyles() touches document too.
if (typeof document !== "undefined") {
  installThemeStyles();
  if (!document.getElementById("sigil-forced-theme")) {
    const el = document.createElement("style");
    el.id = "sigil-forced-theme";
    el.textContent = renderForcedThemeCss();
    document.head.appendChild(el);
  }
}

const preview: Preview = {
  parameters: {
    layout: "padded",
    // v10 viewport API: options map here, selection via initialGlobals below
    viewport: {
      options: {
        m320: { name: "320 — mobile", styles: { width: "320px", height: "640px" } },
        m480: { name: "480 — large phone", styles: { width: "480px", height: "720px" } },
        m768: { name: "768 — tablet", styles: { width: "768px", height: "900px" } },
        m1024: { name: "1024 — desktop", styles: { width: "1024px", height: "768px" } },
      },
    },
  },
  // Sibling of `parameters` — pre-selects the desktop preset on load.
  initialGlobals: {
    viewport: { value: "m1024", isRotated: false },
  },
  decorators: [
    withThemeByDataAttribute({
      attributeName: "data-sigil-theme",
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
    }),
  ],
};
export default preview;
```

The viewport presets mirror the sandbox's breakpoints (320/480/768/1024) so the two tools agree; `m1024` is pre-selected on load via `initialGlobals`.

### MDX docs (all four)

Four narrative pages under `src/stories/`, all in English (CLAUDE.md rule):
`Introduction.mdx`, `DesignTokens.mdx`, `Theming.mdx`, `McpIntegration.mdx` — purposes as listed under *Affected files*. They render via `@storybook/addon-docs` and cross-link to the widget stories.

**Stack compliance:** NATIVE (React + Vite + TS, same as the widget build; devDependencies only).
**Future alignment:** N/A — no `VISION.md` in the project root.

### Why this over alternatives

- **Target Storybook 8.x (rejected — was the prior draft's choice).** Chosen because the task is explicitly "the latest current version," and v10 is verified compatible with the existing React 18 + Vite 5 stack, so there is no compatibility reason to hold back a major line. Pinning 8.x would ship a two-major-versions-stale dev tool on day one.
- **Generated stories from `WIDGET_ENTRIES` (rejected as primary).** A loop over the registry would mean "add a widget → no story edits," matching the project's registry ethos, but Storybook's static indexer favours statically-analysable named exports; generated stories degrade autodocs, produce opaque story IDs, and lose per-widget titles. Since documentation quality is the goal, explicit per-widget files win.
- **Replace the sandbox with Storybook (rejected).** The sandbox is a lighter, faster inner-loop tool (no Storybook boot). Keep both; share the dataset catalog.
- **Reuse `vite.config.ts` in `viteFinal` (rejected).** That config is `WIDGET=`-rooted and applies `viteSingleFile` — wrong shape for a multi-component Storybook.
- **MDX-only docs without stories (rejected).** Loses Controls, the args table, and the future visual-regression surface.
- **Drive Storybook with the MCP `mountWidget` shell (rejected).** Stories render Views directly, as the sandbox does. Exercising the transport belongs to the existing vitest suite.

## Acceptance Criteria

- [ ] The installed Storybook is on the **10.x** line (`npx storybook@latest init`), and `package.json` `devDependencies` contain `storybook`, `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-themes`, `@storybook/addon-a11y` — and do **not** contain `@storybook/addon-essentials`.
- [ ] `npm run dev:storybook` boots Storybook locally and lists all 7 widgets under a `Widgets/` hierarchy, plus the 4 MDX pages in the sidebar.
- [ ] Each widget has autodocs (`tags: ["autodocs"]`) showing a payload args table, and at least the `minimal`, an `edgeLabels`/edge, and a `negatives` state (where the widget's dataset set provides one) as named stories.
- [ ] The theme toolbar toggle switches every story between light and dark by flipping `data-sigil-theme` — verified visually on bar-chart and pie-chart.
- [ ] The viewport toolbar offers the 320/480/768/1024 presets and they resize the story canvas.
- [ ] `npm run typecheck` passes with `.storybook/**/*` and all `*.stories.tsx` included in `tsconfig.json`. No `any` / non-null-assertion hacks introduced to dodge `noUncheckedIndexedAccess` — the `payloadById` helper is the sanctioned path.
- [ ] `npm run build:storybook` produces a static `storybook-static/` build with **zero** Storybook build errors; `storybook-static/` is gitignored.
- [ ] Payloads are sourced from `src/widgets/sandbox/datasets/*` — no payload literals are copied into story files (grep check: story files import dataset arrays and call `payloadById`; they never redefine `data:` / `series:` / `cells:` inline).
- [ ] Production widget bundles are unaffected: `npm run build` output for the 7 production widgets is unchanged (Storybook touches no View source, no `vite.config.ts`, no payload types). `npm test` still passes.
- [ ] All 4 `.mdx` files are in English (CLAUDE.md rule); CLAUDE.md "Useful commands" lists `dev:storybook` / `build:storybook` and the MDX-language note is added.
- [ ] Work is committed in logical steps (scaffold → decorators → stories → MDX → tooling docs), not one monolithic commit.

## Non-goals

- **No visual regression in this task.** No Chromatic, no `@storybook/test-runner`, no snapshot job. (Recorded for the future: Chromatic is the chosen backend when Phase 2 happens — see Future Considerations.)
- **No GitHub Pages deploy / no CI workflow** in this task. No `.github/workflows/storybook.yml`; no README badge/link yet (added when the public build is deployed in a later task).
- **No changes to production widget bundles.** No edits to any `*View.tsx`, no Recharts markup changes, no payload type changes in `src/shared/payloads.ts`.
- **No changes to** `src/server.ts`, `src/stdio.ts`, `src/mcp-server.ts`, `src/registry.ts`, `vite.config.ts`, or the build pipeline (`scripts/build-widgets.ts`).
- **No removal of the sandbox.** It stays as the fast inner-loop tool; datasets are shared.
- **No removal of `palette-preview`.** It remains a dev-only widget in `vite.config.ts`'s `DEV_ONLY_WIDGETS`. Its eventual retirement (once `DesignTokens.mdx` covers tokens) is a separate follow-up — do not touch it or `vite.config.ts` here.
- **No new production/runtime dependencies.** Storybook and its addons are devDependencies only.
- **No `package.json` `engines` change.** That field governs the shipped MCP server's runtime (`node >=18`); Storybook is a dev tool and does not alter it.
- **No bundle-size work.** Per-widget Recharts inlining is intentional (CLAUDE.md / `memory/feedback_bundle_size.md`).
- **No View refactor to expose animation toggles.** That belongs to the future visual-regression phase, not here.
- **No replacement of the existing vitest suite.**

## Future Considerations

- **Phase 2 — Visual regression (separate task).** Add snapshot diffing over the same stories using **Chromatic** (decided: hosted, generous free tier, polished diff UI, handles animation via reduced-motion + a small `parameters.chromatic.delay`). The blocker to solve there is **Recharts animation determinism**: Recharts animates SVG via `react-smooth` (JS-driven, ~1.5 s), not CSS, so naive screenshot diffing flaps. Mitigation order: (1) Chromatic reduced-motion + delay; (2) if still flaky, thread an opt-in `animate?: boolean` prop through the Views to Recharts' `isAnimationActive` (default `true` in prod, `false` in stories) — a *scoped* View change that belongs to that task's spec. This is why visual regression is deliberately out of the current scope.
- **Phase 3 — Deploy (separate task).** A GitHub Actions workflow builds `storybook-static` and publishes to GitHub Pages with least-privilege `permissions: { pages: write, id-token: write }`; README then links the public URL as a portfolio artifact.
- **`palette-preview` retirement.** Once `DesignTokens.mdx` covers tokens, the dev-only `palette-preview` widget may be redundant — fold it in and drop it in a follow-up.
- **Auto-generated stories for the long tail.** Once widget count grows, revisit a generated-from-registry approach for the bulk of states while keeping hand-authored "hero" stories per widget for docs.
- **Interaction tests.** Story `play` functions could assert hover/tooltip/legend behaviour.
- **a11y gating.** The a11y addon is informational here; a later task could fail CI on new violations.
- **Vitest browser integration.** Storybook 10 ships `@storybook/addon-vitest` (Vitest browser mode + Playwright) which could unify unit and visual tests under one runner — evaluate against the current `environment: "node"` vitest config before adopting.

## Design Notes

### Implementation order (one commit per step)

1. **Scaffold.** Run `npx storybook@latest init` (React-Vite framework), pin versions, rewrite `.storybook/main.ts` to the addon list above (remove any `addon-essentials` the initializer adds for older lines; confirm it installed the 10.x line). Add `dev:storybook` / `build:storybook` scripts, gitignore `storybook-static/`, add `.storybook/**/*` to tsconfig `include`. Verify `dev:storybook` boots with the sample stories, then delete the samples.
2. **Theme + viewport decorators.** Author `.storybook/preview.tsx` (the v10 `options`/`initialGlobals` viewport shape, not the old `viewports` map). Verify the theme toggle flips `data-sigil-theme` on one throwaway story.
3. **Story files.** Add `from-datasets.ts`, then the 7 `*.stories.tsx`. Verify autodocs + Controls render; confirm payloads come only from the catalog.
4. **MDX docs.** Author the 4 MDX pages (English). Verify they render and cross-link.
5. **Tooling docs.** Update CLAUDE.md commands + MDX-language note.

### Subtleties

- **`@storybook/addon-essentials` is gone in v10.** Do not add it. Controls / viewport / backgrounds / actions / toolbars are in core; autodocs + MDX come from `@storybook/addon-docs`. If `init` (or muscle memory) adds essentials, remove it — its presence is a v8 tell and will fail `npm install`/build on the 10.x line.
- **v10 type imports + stable API.** Import `Meta` / `StoryObj` / `Preview` / `StorybookConfig` from `@storybook/react-vite` (not the old `@storybook/react`). Use the **stable CSF 3** type-annotation style (`const config: StorybookConfig`, `const preview: Preview`) in both `main.ts` and `preview.tsx` — **do not mix** with the experimental CSF Next `defineMain`/`definePreview` (those carry a 🧪 label in v10 docs and `init` does not emit them). The `framework: { name, options }` object form is the `StorybookConfig` shape (the CSF Next shorthand is a bare string — don't combine the two).
- **v10 viewport API.** Use `parameters.viewport.options` (a map) plus `initialGlobals: { viewport: { value: "m1024", isRotated: false } }` as a **sibling of `parameters`** (not nested inside it) to pre-select a preset. The draft's `viewport: { viewports: {…} }` was the SB8 shape and no longer applies.
- **SSR/Node-pass guard for theme injection.** Wrap **both** `installThemeStyles()` and the `renderForcedThemeCss()` injection in `typeof document !== "undefined"`. `installThemeStyles()` ([theme.ts:519](src/widgets/shared/theme.ts)) inserts a `<style>` and would throw if `build:storybook` or `addon-docs` evaluates `preview.tsx` in a Node context — unlike the sandbox's `App.tsx`, which only ever runs in the browser.
- **`noUncheckedIndexedAccess: true`.** `barDatasets[0]` is `Dataset<…> | undefined`. Stories must not index the array directly; `payloadById` performs the lookup-and-throw so typecheck stays clean without non-null assertions.
- **Separate Vite pipeline.** `.storybook/main.ts` must not import the repo `vite.config.ts` — that config roots into one widget dir and applies `viteSingleFile`. Only add a `viteFinal` if a concrete alias/plugin need arises.
- **`.js` import specifiers.** Story files and decorators use `.js` specifiers on relative TS imports, matching `moduleResolution: "Bundler"`.
- **MDX under the English rule.** CLAUDE.md mandates English for Markdown docs; `.mdx` is documentation in the same spirit. Author all story docs in English and note this explicitly in CLAUDE.md so the rule's scope is unambiguous.
- **Node for dev.** Storybook 10's CLI prefers Node 20+. Local is Node 22, so this is a non-issue; do not change `package.json` `engines` (it governs the published server runtime, not the dev toolchain).
- **Vitest is unaffected.** `vitest.config.ts` uses `include: ["src/__tests__/**/*.test.ts"]` + `environment: "node"`. Neither the new `src/widgets/shared/storybook/from-datasets.ts` helper nor any `*.stories.tsx` matches that glob, so `npm test` neither runs nor type-loads them — acceptance criterion "`npm test` still passes" is a pure regression guard, not a hidden dependency.

### Audit trail

- Reconciled against npm: `storybook@latest` = **10.4.2**; `@storybook/addon-essentials` latest = **8.6.x** with no v9/v10 release (confirms it must not appear in the install); `@storybook/react-vite@10` peers allow `vite ^5` + `react ^18`; `@storybook/react-vite@10.4.2` exports a `./node` subpath; `@storybook/addon-themes@latest` = **10.4.2** with peer `storybook ^10.4.2` (so `withThemeByDataAttribute` is compatible).
- API style decided: **stable CSF 3** (`StorybookConfig` / `Preview` type annotations) over experimental CSF Next (`defineMain`/`definePreview`, 🧪), per the spec-critic warning — `init` emits the stable form and a docs tool should not ride an experimental config API. `main.ts` and `preview.tsx` samples were made consistent; `initialGlobals` added to the preview sample; the `installThemeStyles()` call was moved inside the `typeof document` guard.
- Storybook v10 docs (Context7) consulted for the viewport `options`/`initialGlobals` API and `addon-docs` autodocs.
- Codebase facts verified against source: `theme.ts` exports, `Dataset<P>` shape, `WIDGET_ENTRIES`, View export names, bar dataset ids, `tsconfig.json` `include`, `vitest.config.ts` include glob, and the `WIDGET=`-rooted `vite.config.ts`.
