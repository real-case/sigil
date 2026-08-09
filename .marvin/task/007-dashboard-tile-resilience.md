---
slug: dashboard-tile-resilience
type: feature
status: shipped
created: 2026-08-09
tracker: specs/composition-program.md#1-dashboard-tile-resilience
supersedes: none
stack: typescript, react
risk: medium
breaking: false
spike_required: false
test_command: npm test
contract_sha: 1ec813d35182ece8
---

# Dashboard tile resilience

## Goal

Make a malformed dashboard tile degrade to an inline error card naming the tile type and the reason, so sibling tiles keep rendering — replacing today's behaviour where one bad tile throws inside render and takes the entire dashboard with it. En route, delete the hardcoded tile-type mirror in the dashboard's payload guard, which is already two entries stale and silently breaks every `render_dashboard` call containing a `sankey` or `map` tile.

## Context

- Related patterns: [`DashboardView.tsx:37-60`](../../src/widgets/dashboard/DashboardView.tsx) maps tiles to `WIDGET_VIEWS[tile.type]` and passes `tile.payload as never` straight into the View — no validation. [`SankeyView.tsx:246`](../../src/widgets/sankey/SankeyView.tsx) is the only widget that self-validates in-view, rendering `EmptyState variant="error"`; that is the pattern this task generalises. [`widget-shell.tsx:27,35,67`](../../src/widgets/shared/widget-shell.tsx) shows where guards run today — `extractPayload` under `mountWidget`'s `ontoolresult` only, i.e. the standalone path.
- Callers / reverse-deps:
  - `WIDGET_VIEWS` — sole consumer is [`DashboardView.tsx:38`](../../src/widgets/dashboard/DashboardView.tsx). The entry-shape change is contained.
  - The eleven `isXPayload` guards — consumed by their own `App.tsx` via `mountWidget`, and by [`payloads.test.ts:2-9`](../../src/__tests__/payloads.test.ts) (8 of 11 imported; `map`, `stat-panel`, `dashboard` are untested). `src/stories/McpIntegration.mdx:43` names `isBarChartPayload` in a code sample but imports no path, so it stays accurate.
  - `DashboardTile.type` — read by `DashboardView`, written by [`tools/dashboard.ts:75`](../../src/tools/dashboard.ts) via a cast. Widening it typechecks under TS 7.0.2 (verified against the cast and an un-cast assignment).
  - Build wiring is unaffected: `scripts/build-widgets.ts` and `vite.config.ts` enumerate from `src/registry.ts`, never from files, and `.storybook/main.ts` globs `*.stories.@(ts|tsx)`.
  - `.design-sync/config.json` carries a `DashboardView` dts string listing the tile-type union, but [`design-sync-config.test.ts:45,67-91`](../../src/__tests__/design-sync-config.test.ts) pins only property *names* via `\bname\??:`, not union members — so this change does not touch it.
- Constraints:
  - **Live bug, probe-verified.** `isDashboardPayload`'s `TILE_TYPES` set at [`dashboard/App.tsx:5-14`](../../src/widgets/dashboard/App.tsx) has 8 entries; `WIDGET_VIEWS`, `DashboardTileType` and the `render_dashboard` zod enum each have 10. A dashboard containing a `sankey` or `map` tile fails the top-level guard, so the host shows "Could not load data / Could not parse the tool result" for the whole dashboard. `git show --stat` confirms the mechanism: `1fd7ddc` (map) and `6e0f1d9` (sankey) each touched `widget-views.ts` and `payloads.ts` and never `dashboard/App.tsx`. It is invisible in every dev surface because the sandbox ([`sandbox/datasets/index.ts:68`](../../src/widgets/sandbox/datasets/index.ts)) and Storybook ([`Dashboard.stories.tsx:8`](../../src/widgets/dashboard/Dashboard.stories.tsx)) both render `DashboardView` directly, bypassing `mountWidget` — while `sandbox/datasets/dashboard.ts:76-98` ships sankey and map tile presets that appear to work.
  - **`WIDGET_VIEWS` is a plain object literal**, so a bare index inherits `Object.prototype`: `WIDGET_VIEWS["toString"]` is a truthy function. Today `TILE_TYPES.has("toString")` is `false` and the payload never gets that far; once the type set is deleted, lookup **must** be own-property-checked or a tile named `toString` / `__proto__` / `constructor` / `valueOf` throws `TypeError: entry.isPayload is not a function` inside `Tile` — above the boundary, killing the whole dashboard. This is the single largest hazard the loosening introduces and AC8 exists for it.
  - **Error boundaries cannot be proven by SSR.** Probed against React 19.2.8 in this repo: both `renderToString` and `renderToStaticMarkup` let a child's throw escape rather than routing it to `getDerivedStateFromError`. The boundary therefore gets a pure unit oracle plus a wiring assertion, not a render oracle.
  - **SSR of the real `DashboardView` does work** in the existing `environment: "node"` setup — a probe rendered bar + sankey + map + unknown tiles in 7 ms (5392 bytes). It needs only `*.test.tsx` added to the include glob; JSX transforms without a Vite plugin because `tsconfig.json:7` sets `"jsx": "react-jsx"` and vitest's esbuild pass honours it (verified: 11 files / 324 tests with no plugin).
  - **`npm test` cannot observe the include-glob change.** Verified: a deliberately failing `*.test.tsx` in `src/__tests__/` leaves `npm test` at `10 passed`, exit 0, because the glob simply does not collect it. Any acceptance criterion about the new tests must name them explicitly — AC6 does.
  - Repo rule (CLAUDE.md): widgets ship as self-contained single-file HTML; no bundle-size optimisation. Nothing here adds a runtime dependency.
  - No error boundary exists anywhere: `grep -rn "componentDidCatch\|getDerivedStateFromError\|ErrorBoundary" src/` returns zero matches.
- Sibling specs: `.marvin/task/001`–`006` are all shipped and unrelated (branch workflow, pie `maxSegments`, line end-caps, table sparklines, design-system docs, design-system closure). This is item 1 of the composition program in [`specs/composition-program.md`](../../specs/composition-program.md); item 2 (`widget-registry-derivation`) is listed as an independent sibling, not a dependency, and this spec deliberately takes the tile-type mirror off its plate by deleting it rather than deriving it.

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: src/widgets/bar-chart/guard.ts
    action: new
    intent: isBarChartPayload + isBarDatum moved verbatim out of App.tsx; imports payload types only, never App.tsx or widget-shell
    satisfies: [AC1, AC5, AC9]
  - id: F2
    path: src/widgets/line-chart/guard.ts
    action: new
    intent: isLineChartPayload + helpers moved verbatim out of App.tsx
    satisfies: [AC1, AC5, AC9]
  - id: F3
    path: src/widgets/pie-chart/guard.ts
    action: new
    intent: isPieChartPayload + isPieDatum moved verbatim out of App.tsx
    satisfies: [AC1, AC5, AC9]
  - id: F4
    path: src/widgets/table/guard.ts
    action: new
    intent: isTablePayload + column-aware row validation moved verbatim out of App.tsx
    satisfies: [AC1, AC5, AC9]
  - id: F5
    path: src/widgets/scatter-chart/guard.ts
    action: new
    intent: isScatterChartPayload + helpers moved verbatim out of App.tsx
    satisfies: [AC1, AC5, AC9]
  - id: F6
    path: src/widgets/treemap/guard.ts
    action: new
    intent: isTreemapPayload + recursive isTreemapNode moved verbatim out of App.tsx
    satisfies: [AC1, AC5, AC9]
  - id: F7
    path: src/widgets/heatmap/guard.ts
    action: new
    intent: isHeatmapPayload + helpers moved verbatim out of App.tsx
    satisfies: [AC1, AC5, AC9]
  - id: F8
    path: src/widgets/stat-panel/guard.ts
    action: new
    intent: isStatPanelPayload + isStatItem moved verbatim out of App.tsx
    satisfies: [AC1, AC5, AC9]
  - id: F9
    path: src/widgets/sankey/guard.ts
    action: new
    intent: isSankeyPayload + helpers moved verbatim out of App.tsx
    satisfies: [AC1, AC5, AC9]
  - id: F10
    path: src/widgets/map/guard.ts
    action: new
    intent: isMapPayload + helpers moved verbatim out of App.tsx
    satisfies: [AC1, AC5, AC9]
  - id: F11
    path: src/widgets/dashboard/guard.ts
    action: new
    intent: isDashboardPayload moved out of App.tsx AND loosened — the hardcoded TILE_TYPES set is deleted, so a tile needs only a non-empty string type and a non-null object payload; which types render becomes Tile's business
    satisfies: [AC2, AC3, AC5, AC9]
  - id: F12
    path: src/widgets/bar-chart/App.tsx
    action: edit
    intent: drop the inlined guard, import isBarChartPayload from ./guard.js
    satisfies: [AC5]
    anchor: src/widgets/bar-chart/App.tsx:5
  - id: F13
    path: src/widgets/line-chart/App.tsx
    action: edit
    intent: drop the inlined guard, import from ./guard.js
    satisfies: [AC5]
  - id: F14
    path: src/widgets/pie-chart/App.tsx
    action: edit
    intent: drop the inlined guard, import from ./guard.js
    satisfies: [AC5]
  - id: F15
    path: src/widgets/table/App.tsx
    action: edit
    intent: drop the inlined guard, import from ./guard.js
    satisfies: [AC5]
  - id: F16
    path: src/widgets/scatter-chart/App.tsx
    action: edit
    intent: drop the inlined guard, import from ./guard.js
    satisfies: [AC5]
  - id: F17
    path: src/widgets/treemap/App.tsx
    action: edit
    intent: drop the inlined guard, import from ./guard.js
    satisfies: [AC5]
  - id: F18
    path: src/widgets/heatmap/App.tsx
    action: edit
    intent: drop the inlined guard, import from ./guard.js
    satisfies: [AC5]
  - id: F19
    path: src/widgets/stat-panel/App.tsx
    action: edit
    intent: drop the inlined guard, import from ./guard.js
    satisfies: [AC5]
  - id: F20
    path: src/widgets/sankey/App.tsx
    action: edit
    intent: drop the inlined guard, import from ./guard.js
    satisfies: [AC5]
  - id: F21
    path: src/widgets/map/App.tsx
    action: edit
    intent: drop the inlined guard, import from ./guard.js
    satisfies: [AC5]
  - id: F22
    path: src/widgets/dashboard/App.tsx
    action: edit
    intent: drop the inlined guard and the stale TILE_TYPES literal, import isDashboardPayload from ./guard.js
    satisfies: [AC3, AC5]
    anchor: src/widgets/dashboard/App.tsx:5
  - id: F23
    path: src/widgets/shared/widget-views.ts
    action: edit
    intent: entries become { View, isPayload } importing each widget's guard.js; add lookupWidgetView(type) using Object.hasOwn so inherited Object.prototype keys resolve to undefined
    satisfies: [AC1, AC2, AC8, AC9]
    anchor: src/widgets/shared/widget-views.ts:20
  - id: F24
    path: src/widgets/shared/TileBoundary.tsx
    action: new
    intent: class error boundary rendering EmptyState variant="error" naming the tile type and the thrown message
    satisfies: [AC4]
  - id: F25
    path: src/widgets/dashboard/Tile.tsx
    action: new
    intent: owns the four failure modes — nested dashboard, unknown type, guard-rejected payload, runtime throw — and otherwise renders the View inside EmbeddedContext wrapped in TileBoundary
    satisfies: [AC1, AC2, AC4, AC8, AC10]
  - id: F26
    path: src/widgets/dashboard/DashboardView.tsx
    action: edit
    intent: render Tile inside each Card; DashboardView keeps only grid layout, colSpan clamping and the empty state
    satisfies: [AC1, AC2]
    anchor: src/widgets/dashboard/DashboardView.tsx:37
  - id: F27
    path: src/shared/payloads.ts
    action: edit
    intent: widen DashboardTile.type to DashboardTileType | (string & {}) so an unrecognised type is representable, keeping autocomplete on the ten known values
    satisfies: [AC2]
    anchor: src/shared/payloads.ts:220
  - id: F28
    path: vitest.config.ts
    action: edit
    intent: add src/__tests__/**/*.test.tsx to the include glob so component-level SSR tests are collected; no plugin needed, tsconfig jsx react-jsx already covers the transform. The include array is the ONLY permitted edit to this file — in particular do not add passWithNoTests, which would turn AC6's oracle green with the .tsx still uncollected
    satisfies: [AC6]
    anchor: vitest.config.ts:6
  - id: F29
    path: src/__tests__/payloads.test.ts
    action: edit
    intent: import the eleven guards from their guard.js modules, keep the existing reject tables unchanged, extend GuardCase with an optional accepts map generating titles of the form "accepts <label>", and add cases for map, stat-panel and dashboard. The dashboard case carries one accept per tile type ("sankey tile", "map tile", …) PLUS the two accepts only the loosened guard can pass — "an unrecognised tile type" (type "totally-made-up") and "a prototype-key tile type" (type "toString") — and rejects "an empty type string". valid fixtures — map { title, scope "world", variant "choropleth", data [{ id "USA", value 1 }] }; stat-panel { title, items [{ label "A", value 1 }] }; dashboard { title, tiles [{ type "bar-chart", payload { title, data [], orientation "vertical" } }] }. map and stat-panel take rejects tables in the existing style, not empty ones
    satisfies: [AC3, AC5, AC11]
    anchor: src/__tests__/payloads.test.ts:2
  - id: F30
    path: src/__tests__/dashboard-tile.test.tsx
    action: new
    intent: renderToString a dashboard holding a guard-rejected tile, an unknown-type tile, a prototype-key tile, a nested-dashboard tile and valid siblings, asserting the typed error copy and that siblings still render. renderToString HTML-escapes the copy, so assertions over the unknown-widget description must match the escaped form (No widget of type &quot;toString&quot;.) or a quote-free substring — the rendered copy keeps its real quotes
    satisfies: [AC1, AC2, AC8, AC10]
  - id: F31
    path: src/__tests__/tile-boundary.test.ts
    action: new
    intent: pure tests of TileBoundary's contract plus a wiring assertion that Tile's success branch returns a tree containing TileBoundary with label equal to the tile type, both under one "tile error containment" describe. No renderer is involved — construct the boundary directly, assign onto the instance the state object that TileBoundary.getDerivedStateFromError(new Error("boom")) returns, then inspect what b.render() gives back; and call Tile as a plain function with a type and payload argument
    satisfies: [AC4]
  - id: F32
    path: src/stories/Dashboard.mdx
    action: edit
    intent: add sankey to the tile-type list, replace the false claim that adding to WIDGET_VIEWS is all it takes to make a widget tileable, note that the map now also imports each widget's guard, and document the degraded-tile behaviour
    satisfies: [AC7]
    anchor: src/stories/Dashboard.mdx:46
  - id: F33
    path: specs/composition-program.md
    action: edit
    intent: flip item 1's banner to shipped with the spec and PR links plus as-shipped deltas, per the program's own delivery convention
    satisfies: "—"
  - id: F34
    path: src/__tests__/widget-views.test.ts
    action: new
    intent: pins for the seam this change creates, grouped under a "widget-views seam pins" describe — WIDGET_VIEWS keys equal registry names minus dashboard in both directions, lookupWidgetView rejects inherited prototype keys, and no import specifier in any guard.ts, widget-views.ts, Tile.tsx or TileBoundary.tsx reaches App or widget-shell. The import pin must be extension-agnostic (moduleResolution is Bundler, so a bare "./App" resolves and typechecks) — match /from\s*["'][^"']*\/(App|widget-shell)(\.[jt]sx?)?["']/ rather than the literal string App.js
    satisfies: [AC8, AC9]
  - id: F35
    path: src/widgets/sandbox/datasets/dashboard.ts
    action: edit
    intent: append a degraded preset (category "degraded") holding a guard-rejected tile, an unknown-type tile, a nested-dashboard tile and valid siblings, so the new error copy is visible in npm run dev:sandbox; its broken tiles are inline literals rather than payloadById because no catalog supplies an invalid payload — note that departure in the file header comment, which currently claims presets reuse catalog payloads verbatim
    satisfies: [AC7]
    anchor: src/widgets/sandbox/datasets/dashboard.ts:104
  - id: F36
    path: src/widgets/sandbox/datasets/types.ts
    action: edit
    intent: add "degraded" to DatasetCategory and CATEGORY_ORDER so the new preset is labelled honestly instead of borrowing "nested", which would describe nesting the preset does not have; verified zero blast radius — neither symbol has a consumer anywhere outside this file
    satisfies: [AC7]
    anchor: src/widgets/sandbox/datasets/types.ts:9
  - id: F37
    path: src/widgets/dashboard/Dashboard.stories.tsx
    action: edit
    intent: add a Degraded story reading the new preset by id, honouring the one-story-per-catalog-dataset rule this file states at its head and that holds 1:1 across all eleven widgets today; nothing pins it, so omitting it would drift silently — the same class of failure this task exists to close
    satisfies: [AC7]
    anchor: src/widgets/dashboard/Dashboard.stories.tsx:16
build_order: [F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13, F14, F15, F16, F17, F18, F19, F20, F21, F22, F27, F23, F24, F25, F26, F28, F29, F34, F31, F30, F36, F35, F37, F32, F33]
depends_on: []
contract:
  kind: function
  signature: |
    // src/widgets/<name>/guard.ts — one per widget, side-effect free.
    // MUST import only from ../../shared/payloads.js — never ./App.js, never widget-shell.
    export function isBarChartPayload(value: unknown): value is BarChartPayload;
    // …identically for line-chart, pie-chart, table, scatter-chart, treemap,
    //    heatmap, stat-panel, sankey, map

    // src/widgets/dashboard/guard.ts — loosened: no tile-type set at all
    export function isDashboardPayload(value: unknown): value is DashboardPayload;
    //   tile is valid iff: typeof type === "string" && type.length > 0
    //                   && typeof payload === "object" && payload !== null
    //                   && (colSpan === undefined || typeof colSpan === "number")

    // src/widgets/shared/widget-views.ts
    export interface WidgetViewEntry {
      View: ComponentType<{ payload: never }>;
      isPayload: (value: unknown) => boolean;
    }
    export const WIDGET_VIEWS: Record<DashboardTileType, WidgetViewEntry>;
    export function lookupWidgetView(type: string): WidgetViewEntry | undefined;
    //   Body is pinned literally — a bare index returns Object.prototype members
    //   ("toString", "valueOf", "constructor", "__proto__") as truthy non-entries,
    //   and indexing a Record<DashboardTileType, …> with a string is TS7053 under
    //   this tsconfig (strict + noUncheckedIndexedAccess). Both are avoided by:
    //     return Object.hasOwn(WIDGET_VIEWS, type)
    //       ? WIDGET_VIEWS[type as DashboardTileType]
    //       : undefined;

    // src/widgets/shared/TileBoundary.tsx
    // tsconfig sets noImplicitOverride and the repo has no other class component,
    // so the `override` modifiers below are load-bearing, not decoration (TS4114).
    export class TileBoundary extends Component<
      { label: string; children: ReactNode },
      { message: string | null }
    > {
      override state: { message: string | null } = { message: null };
      static getDerivedStateFromError(error: unknown): { message: string };
      override render(): ReactNode;
    }

    // src/widgets/dashboard/Tile.tsx
    export function Tile(props: { type: string; payload: unknown }): ReactNode;
    //   Resolution order, first match wins. `label` is `type` clamped for layout:
    //     const label = type.length > 40 ? type.slice(0, 39) + "…" : type;
    //   1. type === "dashboard"        -> EmptyState error "Nested dashboard"
    //                                     / "A dashboard cannot be a tile inside another dashboard."
    //   2. !lookupWidgetView(type)     -> EmptyState error "Unknown widget"
    //                                     / `No widget of type "<label>".`
    //   3. !entry.isPayload(payload)   -> EmptyState error `Invalid <label> tile`
    //                                     / `The payload did not match the <label> schema.`
    //   4. otherwise            -> <EmbeddedContext.Provider value={true}>
    //                                <TileBoundary label={label}>
    //                                  <View payload={payload as never} />
    //                                </TileBoundary>
    //                              </EmbeddedContext.Provider>
    //      TileBoundary renders EmptyState error `Could not render <label>`
    //      / the thrown message, or "An unexpected error occurred." when absent.

    // src/shared/payloads.ts
    export interface DashboardTile {
      type: DashboardTileType | (string & {});
      payload: unknown;
      colSpan?: number;
    }
criteria:
  - id: AC1
    statement: Given a dashboard whose tile payload fails that widget's guard, when the dashboard renders, then that tile shows an inline error card naming the tile type and every sibling tile renders normally.
    implemented_by: [F1, F23, F25, F26, F30]
    oracle:
      kind: test
      ref: src/__tests__/dashboard-tile.test.tsx::a guard-rejected tile degrades to an error card naming its type while siblings render
    failure: Today renderToString of a dashboard containing a bar-chart tile whose payload is `{ title "broken", data null, orientation "vertical" }` throws `Cannot read properties of null (reading 'reduce')`; in a host that unmounts the whole dashboard, siblings included.
  - id: AC2
    statement: Given a dashboard tile whose type is not in WIDGET_VIEWS — a garbage string, or a key inherited from Object.prototype such as toString — when the dashboard renders, then only that tile shows the unknown-widget card and the rest of the grid is unaffected.
    implemented_by: [F11, F23, F25, F26, F27, F30]
    oracle:
      kind: test
      ref: src/__tests__/dashboard-tile.test.tsx::an unrecognised tile type, including an Object.prototype key, renders the unknown-widget card while siblings render
    failure: Today isDashboardPayload rejects the whole payload, so mountWidget renders "Could not load data / Could not parse the tool result" and the DashboardView unknown-widget branch at line 51 is unreachable dead code. After the loosening, a bare index would additionally make WIDGET_VIEWS toString truthy, so Tile would call entry.isPayload and throw TypeError above the boundary.
  - id: AC3
    statement: isDashboardPayload accepts a dashboard payload for every one of the ten tile types the render_dashboard tool accepts, sankey and map included.
    implemented_by: [F11, F22, F29]
    oracle:
      kind: test
      ref: "src/__tests__/payloads.test.ts::payload guards > dashboard > accepts sankey tile"
    failure: Probe-verified on current code — a sankey tile and a map tile each return false, so any real dashboard containing one fails to load entirely.
  - id: AC4
    statement: TileBoundary maps a thrown error to an error card naming the tile type and the thrown message and otherwise renders its children unchanged, and Tile's success branch actually wraps the View in it with label equal to the tile type.
    implemented_by: [F24, F25, F31]
    oracle:
      kind: test
      ref: src/__tests__/tile-boundary.test.ts::tile error containment
    failure: No error boundary exists in the repo today. Without the wiring half, an implementation could ship a correct TileBoundary that Tile never uses and still satisfy every other criterion — so the oracle names the describe holding both halves, not either it() alone.
  - id: AC5
    statement: Every widget payload guard is importable from src/widgets/<name>/guard.js, and the existing guard reject-case suite passes unchanged against the extracted modules.
    implemented_by: [F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F22, F29]
    oracle:
      kind: test
      ref: src/__tests__/payloads.test.ts::payload guards
    failure: Today the guards are reachable only through App.tsx, whose import calls mountWidget; a guard cannot be reused by the dashboard without dragging in the MCP mount path.
  - id: AC6
    statement: The new .tsx test file is actually collected by the runner, and the repo gates stay green.
    implemented_by: [F28, F30]
    oracle:
      kind: command
      ref: npx vitest run src/__tests__/dashboard-tile.test.tsx && npm run typecheck && npm test && npm run build
    failure: Verified twice on current code. `npm test` alone reports 10 passed / exit 0 even with a deliberately failing .test.tsx present, because the include glob does not match it. Naming tile-boundary.test.ts in the same filter also defeats the check — it is a .ts file the current glob already matches, so vitest finds it, exits 0, and drops the .tsx silently. Only a filter naming the .tsx alone exits 1 with "No test files found" when F28 is missing; without that, AC1, AC2 and AC10 would sit unrun with every gate green.
  - id: AC7
    statement: The Dashboard story doc lists sankey, drops the false claim that adding a widget to WIDGET_VIEWS is all it takes to make it tileable, and the degraded dashboard preset ships in both dev surfaces — the sandbox catalog and a matching Storybook story.
    implemented_by: [F32, F35, F36, F37]
    oracle:
      kind: prose-review
    failure: The doc keeps a nine-type list that omits sankey and an "all it takes" claim that is false while DashboardTileType and the render_dashboard zod enum remain hand-maintained; and the new error copy stays invisible in every dev surface, which is exactly how the sankey and map tile bug survived two releases.
  - id: AC8
    statement: lookupWidgetView returns undefined for keys inherited from Object.prototype — toString, valueOf, constructor, __proto__ — rather than the truthy non-entries a bare index yields.
    implemented_by: [F23, F34]
    oracle:
      kind: test
      ref: src/__tests__/widget-views.test.ts::lookupWidgetView returns undefined for inherited prototype keys
    failure: WIDGET_VIEWS is a plain object literal, so a bare index makes WIDGET_VIEWS["toString"] a truthy function; Tile then calls entry.isPayload and throws TypeError above the boundary, killing the whole dashboard — newly reachable because this spec deletes the TILE_TYPES set that rejects those strings today.
  - id: AC9
    statement: WIDGET_VIEWS' keys equal the registry widget names minus dashboard in both directions, and no import specifier in any guard.ts, widget-views.ts, Tile.tsx or TileBoundary.tsx reaches App or widget-shell, extension-agnostically.
    implemented_by: [F1, F11, F23, F24, F25, F34]
    oracle:
      kind: test
      ref: src/__tests__/widget-views.test.ts::widget-views seam pins
    failure: A guard.ts written as a re-export from ./App.js passes every other criterion, yet widget-views.ts ships in the dashboard browser bundle where document exists — so ten mountWidget calls would fire at import, each rendering into the dashboard's own root. No gate, build or typecheck detects it; it is visible only in a live host.
  - id: AC10
    statement: A tile typed "dashboard" renders a dedicated Nested dashboard card rather than the generic unknown-widget card.
    implemented_by: [F25, F30]
    oracle:
      kind: test
      ref: src/__tests__/dashboard-tile.test.tsx::a dashboard tile renders the nested-dashboard card
    failure: The no-dashboard-in-dashboard invariant itself survives either way — WIDGET_VIEWS has no dashboard key, so lookupWidgetView returns undefined with or without this criterion. What is at stake is the copy — without it a nested dashboard reads No widget of type dashboard, which is wrong because the widget plainly exists and is deliberately not tileable. Guard-rejecting the type instead would sink the whole dashboard on one nested tile, the failure this task exists to delete.
  - id: AC11
    statement: isDashboardPayload accepts a tile whose type is not a known widget at all — a made-up string, or an Object.prototype key — and still rejects an empty type string, proving the tile-type set was deleted rather than merely corrected.
    implemented_by: [F11, F22, F29]
    oracle:
      kind: test
      ref: "src/__tests__/payloads.test.ts::payload guards > dashboard"
    failure: This is the spec's headline change and every other criterion is blind to it. AC2 renders DashboardView, which never calls the guard (DashboardView.tsx:1-6 imports none; the only call sites are widget-shell.tsx:27,35 on the mountWidget path the SSR test bypasses by design), and AC3 exercises only the ten types a merely-corrected eight-entry mirror would also accept. Without AC11, an F11 that keeps TILE_TYPES and just adds sankey and map passes all ten other criteria while leaving the bug class — an unknown type sinks the whole dashboard — fully intact.
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: none
  path: none
merge_obligations:
  - "npm run typecheck, npm test and npm run build green — .github/workflows/ci.yml runs all three on every PR to dev"
  - "branch task/<slug> off dev; PR targets dev; main is release-only (CLAUDE.md)"
  - "all Markdown in English (CLAUDE.md documentation-language rule)"
  - "flip item 1's banner in specs/composition-program.md on delivery (that document's own convention)"
gates:
  test: npm test
```

## Data & Config

N/A — no migrations, env vars, feature flags or config keys. The `render_dashboard` tool schema in `src/tools/dashboard.ts` is deliberately untouched: it keeps its ten-member zod enum, so the server-side contract an LLM sees is unchanged. Only the widget-side guard loosens.

## Chosen Approach

Variant B — merged `{ View, isPayload }` map plus a dedicated `Tile` component.

1. **Extract eleven guards.** Each `src/widgets/<name>/guard.ts` receives its widget's `isXPayload` and private helpers verbatim from `App.tsx`; `App.tsx` imports it for `mountWidget`. A guard module may import from `../../shared/payloads.js` and nothing else — re-exporting from `App.js` would satisfy the naive reading and reintroduce the mount path into the dashboard bundle, which is why AC9 pins it at the source level.
2. **Loosen the dashboard guard.** `src/widgets/dashboard/guard.ts` drops the hardcoded `TILE_TYPES` set entirely. A tile is structurally valid when `type` is a non-empty string, `payload` is a non-null object, and `colSpan` is absent or a number. Which types actually render becomes `Tile`'s business, so the mirror ceases to exist rather than being kept in sync — and version skew (a host holding a cached older widget bundle while the server sends a newer tile type) degrades one tile instead of the dashboard.
3. **Widen the tile type.** `DashboardTile.type` becomes `DashboardTileType | (string & {})` so an unrecognised type is representable, keeping editor autocomplete on the ten known values.
4. **Carry the guard on the view map, and look it up safely.** `WIDGET_VIEWS` entries become `{ View, isPayload }`, and `lookupWidgetView(type)` returns `WidgetViewEntry | undefined` via `Object.hasOwn` — replacing today's `Record` index that TypeScript types as non-optional while the code truthiness-checks it anyway, and closing the `Object.prototype` hole that deleting `TILE_TYPES` would otherwise open.
5. **Add `TileBoundary`.** A small class component: `getDerivedStateFromError` stores the message, `render` returns `EmptyState variant="error"` titled `Could not render <label>` with the message as description, or `children`.
6. **Add `Tile`.** It resolves the four failure modes in the order given in the contract — nested dashboard, unknown type, guard rejection, runtime throw — and otherwise renders the View inside `EmbeddedContext.Provider` wrapped in `TileBoundary`.
7. **`DashboardView` keeps only layout.** Its `tiles.map()` becomes `<Card …><Tile type={tile.type} payload={tile.payload} /></Card>`; grid template, `colSpan` clamping and the empty state stay put.
8. **Pin the new seam.** `src/__tests__/widget-views.test.ts`, under one `widget-views seam pins` describe, asserts `WIDGET_VIEWS` keys ≡ registry names minus `dashboard` in both directions (composition-program design rule 4, which this change would otherwise defer while making the drift *silent*), that `lookupWidgetView` rejects inherited prototype keys, and — by regexing the module sources in the idiom `design-sync-config.test.ts:116-132` already uses — that no import specifier in any `guard.ts`, `widget-views.ts`, **`Tile.tsx` or `TileBoundary.tsx`** reaches `App` or `widget-shell`. Those two are in the pin because they are the other new modules shipping inside the dashboard browser bundle, where `document` exists and a stray `mountWidget` import would fire for real. The regex must be extension-agnostic — `moduleResolution` is `"Bundler"`, so a bare `from "./App"` resolves and typechecks, slipping past a literal `App.js` match.
9. **Widen the test harness.** `vitest.config.ts` gains `src/__tests__/**/*.test.tsx` in `include`, and nothing else — adding `passWithNoTests` would defeat AC6's oracle. No Vite plugin: `tsconfig.json`'s `"jsx": "react-jsx"` already drives vitest's esbuild transform, verified at 11 files / 324 tests with no plugin present.
10. **Make it visible in both dev surfaces.** `src/widgets/sandbox/datasets/dashboard.ts` gains a `degraded` preset so the new error cards appear in `npm run dev:sandbox` beside the healthy dashboards, and `datasets/types.ts` gains the matching `DatasetCategory` member. Its broken tiles are inline literals, not `payloadById` lookups — no catalog holds an invalid payload — so the file header comment claiming presets reuse catalog payloads verbatim gains a note. `Dashboard.stories.tsx` gains the matching story: the sandbox auto-enumerates the catalog and picks the preset up for free, but Storybook does not, and that file states a one-story-per-dataset rule which currently holds 1:1 across all eleven widgets with nothing pinning it.

Error copy, fixed so the tests can assert it. `<label>` is `type` clamped to 40 characters (suffixed `…` when clamped) so a hostile type string cannot break tile layout; React escapes it, so interpolation is safe:

| Case | Title | Description |
|---|---|---|
| Nested dashboard | `Nested dashboard` | `A dashboard cannot be a tile inside another dashboard.` |
| Unknown type | `Unknown widget` | `No widget of type "<label>".` (existing copy, kept) |
| Guard rejection | `Invalid <label> tile` | `The payload did not match the <label> schema.` |
| Runtime throw | `Could not render <label>` | the thrown `message`, or `An unexpected error occurred.` when absent |

**Stack compliance:** NATIVE
**Future alignment:** N/A — no VISION.md in this repo.

**Stack extensions required:** none.

## Why this over alternatives

- **Variant A — merged map, failure ladder inline in `DashboardView`** (rejected): puts a four-branch failure policy inside the same `tiles.map()` that composition-program items 8 (`dashboard-responsive-grid`) and 9 (`dashboard-sections`) both rewrite (`specs/composition-program.md:198,214`), and makes the ladder testable only through a whole rendered grid. One file cheaper for a worse seam at exactly the place the next two dashboard tasks land.
- **Variant C — separate `widget-guards.ts` map** (rejected): its benefit is that guards become importable without pulling Recharts / d3-geo / us-atlas, but no such consumer exists — `DashboardView` already imports every View, and the guard unit tests import `src/widgets/<name>/guard.ts` directly. Its cost is a second hand-maintained type→something map needing its own pin, which is precisely the drift this task exists to remove.
- **Deriving the tile-type set from `WIDGET_VIEWS` keys instead of deleting it** (rejected): fixes the current drift but keeps the class of bug — an unknown type still sinks the whole dashboard — and the dashboard's guard module would import all ten View modules just to learn ten strings.
- **Upgrading guards to return a reason string** (rejected): would make the invalid-payload card say *which* field failed, but rewrites all eleven guards and their existing reject tables for diagnostic polish, in a task whose point is containment. Recorded under Future Considerations.
- **Adding jsdom to test the boundary for real** (rejected, honestly): the cost is genuinely small — vitest 4 takes a per-file `// @vitest-environment jsdom` docblock, so it is one devDependency and roughly fifteen lines of `react-dom/client` + `act`, and composition-program design rule 5 bars new *runtime* dependencies, not devDependencies. It is rejected because AC4's wiring assertion plus AC8's prototype test close the realistic failure modes for free, and a jsdom harness is worth adopting deliberately — when interaction tests need it (see Future Considerations) — rather than as a side effect of this task. React 19.2.8 genuinely cannot route the throw through a boundary under `renderToString` or `renderToStaticMarkup`, so this is the trade actually being made, not a claim that jsdom is expensive.

## Test Plan

- Harness: vitest 4, `npm test` (`vitest run`), config at `vitest.config.ts` — `environment: "node"`, `css: false`. This spec widens `include` to add `src/__tests__/**/*.test.tsx`; no plugin is added.
- Test locations: `src/__tests__/*.test.ts[x]` — the repo's single flat test directory.
- Conventions observed in neighbours:
  - `payloads.test.ts` uses a declarative `GuardCase[]` table with `omit(key)` / `set(key, value)` mutators over one valid fixture, generating titles `accepts a valid payload`, `rejects null and primitives`, `rejects: <label>` inside a `payload guards > <name>` describe pair. It has no way to express a *second* accepted payload, so F29 extends `GuardCase` with an optional `accepts: Record<string, Mutator>` — keeping one style rather than adding a bespoke `it()` beside the table. Its generated titles read `accepts <label>` (no colon, unlike the reject arm) so AC3's oracle ref resolves exactly; label the dashboard's cases `sankey tile`, `map tile` and so on.
  - `pie-collapse.test.ts`, `table-cells.test.ts` and `line-end-indices.test.ts` test extracted pure modules directly — the model for `tile-boundary.test.ts`.
  - `e2e.test.ts` and `design-sync-config.test.ts` derive expectations from `WIDGETS` rather than restating lists; `widget-views.test.ts` follows suit. `design-sync-config.test.ts:116-132` regexes source text to pin wiring that nothing else can reach — the model for AC9's import pin.
  - No third-party mocking library is installed; only `registration.test.ts:3-9` uses vitest's built-in `vi.hoisted` / `vi.fn` / `vi.mock`. Fixtures elsewhere are inline literals, and none of the new tests need mocking. Keep it that way.
  - `renderToString` HTML-escapes text children, so any assertion over the unknown-widget copy must match `No widget of type &quot;toString&quot;.` or a quote-free substring. The rendered copy keeps its real quotes — this is an assertion-writing constraint, not a copy change.
- New coverage:
  - `dashboard-tile.test.tsx` — `renderToString(<DashboardView payload={…} />)` over a dashboard holding a guard-rejected tile, an unknown-type tile, a `toString`-typed tile, a nested-dashboard tile and valid siblings; asserts the rendered HTML carries the typed error copy and every sibling title, and that the call does not throw. Must be `.tsx`: it is the only new file the widened glob is needed for, which is why AC6's filter names it alone.
  - `tile-boundary.test.ts` — under a `tile error containment` describe: `TileBoundary.getDerivedStateFromError(new Error("boom"))` and rendering an instance in each state, plus calling `Tile({ type, payload })` directly and asserting the returned element tree contains `TileBoundary` with `label === type`. `Tile` is a plain function returning `ReactNode`, so this needs no renderer and the file stays `.ts`.
  - `widget-views.test.ts` — under a `widget-views seam pins` describe: the registry pin, the prototype-key cases, and the extension-agnostic source-level import pin over `guard.ts` × 11, `widget-views.ts`, `Tile.tsx` and `TileBoundary.tsx`.
  - `payloads.test.ts` — imports move to `guard.js`; existing reject tables unchanged; new cases for `map`, `stat-panel` and `dashboard`, the dashboard case carrying one `accepts` entry per tile type. Note this asserts the *tool's* ten types remain acceptable; it does not pin against future drift, because after F11 the guard never inspects `type` at all — AC9's registry pin is what catches a `WIDGET_VIEWS` omission now.

## Definition of Done

- [ ] `npx vitest run src/__tests__/dashboard-tile.test.tsx` green — proves the widened glob actually collects the `.tsx` file (naming the `.ts` file alongside it would defeat the check)
- [ ] `npm test` green (all files, including the widened include glob)
- [ ] `npm run typecheck` green
- [ ] `npm run build` green (widgets + server)
- [ ] `npm run dev:sandbox` shows the degraded dashboard preset rendering distinct error cards with healthy siblings, and `npm run dev:storybook` shows the matching Degraded story
- [ ] `vitest.config.ts`'s only change is the `include` array — no `passWithNoTests`, which would silently defeat the check above
- [ ] `src/stories/Dashboard.mdx` corrected (F32) — docs obligation for this change
- [ ] `specs/composition-program.md` item 1 banner flipped to shipped with spec + PR links and as-shipped deltas (F33), per that document's stated convention
- [ ] Branch `task/dashboard-tile-resilience` off `dev`, PR targets `dev`
- [ ] No version bump, no tag, no changelog — this repo releases only on an explicit request (CLAUDE.md)

## Non-goals

- **Deriving `DashboardTileType` or the `render_dashboard` zod enum from `WIDGETS`.** That is composition-program item 2 (`widget-registry-derivation`). This task removes one mirror by deletion and pins a second (`WIDGET_VIEWS`, AC9); it does not restructure the remaining two.
- **Changing the `render_dashboard` tool schema.** The server-side zod enum keeps its ten members, so the surface an LLM sees is unchanged and no prompt in the wild breaks.
- **Field-level rejection reasons.** Guards keep their `value is P` signature; the error card names the tile type and that the payload did not match, not which key was wrong.
- **An error boundary on the standalone `mountWidget` path.** Same hole, different surface; deliberately deferred so this spec stays one PR.
- **Adopting jsdom.** Deferred to whichever task first needs interaction tests, not taken on as a side effect here.
- **Responsive grid, `colSpan` behaviour, sections, provenance.** Items 8 and 9.
- **`TESTING.md` §A5.** The manual-QA row keeps its current wording; the user scoped the doc work to `Dashboard.mdx` and the sandbox preset.
- **Correcting `specs/composition-program.md`'s claim that CI does not run the test suite.** Verified false (`.github/workflows/ci.yml` runs typecheck, test and build on every PR to `dev`), but explicitly left to a later pass; only the item-1 banner is touched here.
- **Guard coverage for the `sandbox` and `palette-preview` dev entries.** They are not registry widgets and have no guards.

## Assumptions

- Widening `DashboardTile.type` to `DashboardTileType | (string & {})` typechecks against `tools/dashboard.ts:75`'s `args.tiles as DashboardPayload["tiles"]` cast. Verified with `npx tsc --noEmit` under TS 7.0.2 against both the cast and an un-cast assignment. If a later change breaks it, keep `DashboardTileType` on the interface and have `lookupWidgetView` take `string`.
- `.design-sync/config.json`'s `DashboardView` dts string keeps listing the ten known tile types. It stays accurate as a design-facing hint, and `design-sync-config.test.ts` pins property names rather than union members, so it is out of the allowlist.
- The eleven guards move verbatim. Any behavioural change to a guard other than the dashboard's is out of scope, and `payloads.test.ts`'s existing reject tables passing unchanged is the check on that.
- `Tile` stays a plain function component (not `memo`-wrapped or forwarded), so AC4's wiring assertion can call it directly and inspect the returned element tree.

## Open Questions

none

## Security / NFR

- **Input parsing** is the one security-adjacent surface: this task moves untrusted tool-result payloads through *more* validation than today, not less, and removes a path where a malformed payload produced a total render failure. The loosened dashboard guard accepts a wider set of *type strings*, and the risk that creates is concrete rather than theoretical: with a bare index, `Object.prototype` keys resolve to truthy non-entries and throw above the boundary. `lookupWidgetView`'s `Object.hasOwn` check is therefore a correctness requirement, not a style preference, and AC8 is its proof. With it in place nothing is constructed from the untrusted string beyond interpolating a 40-character clamp of it into an error message that React escapes.
- **Error copy leaks a thrown message into the UI.** Sigil widgets render data the host already holds, in the host's own iframe, so this exposes nothing new — but the boundary renders `error.message` only, never a stack.
- **Observability:** none available. Widgets run in a sandboxed host iframe with no telemetry channel; the error card is the only signal, which is why it names the type.
- **A11y:** `EmptyState variant="error"` already sets `role="alert"`, so degraded tiles announce. No new interactive controls, no focus management, no i18n surface (Sigil ships English copy only).
- **Performance:** one extra guard call per tile per render, over payloads already bounded by the tool schemas. Negligible against Recharts' own render cost.

## Critic Verdict & Overrides

Two adversarial passes by `marvin-tm-spec-critic`, both BLOCK, all 19 findings accepted and folded in — **no overrides**.

- **Pass 1** (3 blockers, 6 warnings, 3 nits): AC6's oracle could not observe its own failure (`npm test` stays green whether or not the include glob widens — demonstrated with a deliberately failing `.test.tsx`); deleting `TILE_TYPES` exposed an `Object.prototype` lookup hole that would throw *above* the boundary, re-creating the crash this task removes; and AC5 was satisfiable by a `guard.ts` that merely re-exports from `App.js`, which would fire ten `mountWidget` calls inside the dashboard browser bundle. It also disproved this spec's own earlier claim that `@vitejs/plugin-react` was needed for `.test.tsx` collection.
- **Pass 2** (1 blocker, 4 warnings, 2 nits): the pass-1 AC6 fix was itself blind — naming `tile-boundary.test.ts` in the same `vitest run` filter defeats it, because that `.ts` file already matches the current glob, so vitest exits 0 and drops the `.tsx` silently. AC6 now filters on the `.tsx` alone. Also: three compound criteria (AC4, AC8, AC9) had single-clause oracles, now either narrowed or re-pointed at the enclosing `describe`; AC3's ref did not match the title its own convention generates; F35's preset had no legal `DatasetCategory` (hence F36); and AC10's statement over-claimed an invariant it does not create.

- **Pass 3** — a four-lens verification panel (oracle-falsification, allowlist completeness, codebase-claim audit, headless implementability) plus an independent synthesis that re-executed every cited probe: 12 confirmed findings, 2 dropped as unverifiable. Two blockers. First, `Dashboard.stories.tsx` was missing from the allowlist while F35 adds a fifth dataset — the repo holds a 1:1 story-per-dataset invariant (measured: 7,4,5,7,10,7,5,6,5,6,5 stories against identical dataset counts) that nothing pins, so hence F37. Second and worse: **the spec's headline change had no oracle at all.** AC2's "still passes isDashboardPayload" clause is structurally unobservable through an SSR test, because `DashboardView` never calls the guard — so an F11 that kept `TILE_TYPES` and merely added `sankey` and `map` would have passed all ten criteria while leaving the bug class intact. AC11 now proves the set was deleted rather than corrected. The panel also caught two pinned code sketches that do not compile under this tsconfig (TS7053 on the `lookupWidgetView` index, TS4114 on the boundary's missing `override` modifiers), `renderToString`'s quote escaping breaking the pinned assertions, an `App.js` pin that `moduleResolution: "Bundler"` lets a bare `./App` evade, a `passWithNoTests` escape from AC6, and three citation errors.

The critics confirmed the AC10 design choice (degrade rather than guard-reject) and answered their own open question in the affirmative — `Tile.tsx` and `TileBoundary.tsx` are both inside AC9's import pin. The claim-audit lens independently re-ran every probe this spec cites and found all substantive factual claims correct.

## Design Notes

- **Scope gate (37 files) consciously accepted as one PR.** 20 rows are the mechanical guard extraction (F1–F10 new, F12–F21 one-line edits), 7 are the behavioural surface (F11, F22–F27), and 10 are tests, docs and dev surfaces (F28–F37). Splitting the extraction into its own PR would ship ten modules with no consumer, so the slice stays whole.
- **`npm run typecheck` is red from F12 through F26 — that block is atomic.** Two independent mechanisms: `payloads.test.ts:2-9` imports the guards from `App.js` until F29 repoints them, and `DashboardView.tsx:38` indexes `Record<DashboardTileType, …>` with the widened `DashboardTile.type` from F27 until F26 rewrites it (verified: TS7053). The `build_order` rationale below is about *dependency* order, not about each step compiling; expect green only at the end of the block.
- **`Tile.tsx` hardcodes the string `"dashboard"`,** which mints one new hand-maintained registry reference in a task whose thesis is deleting them. It is unavoidable: `Tile` cannot import `src/registry.ts` without dragging the MCP SDK into the widget bundle, and `WIDGET_VIEWS` deliberately has no `dashboard` key to compare against. Accepted knowingly; if item 2 introduces a lightweight name module, this is its first consumer.
- **The bug and the feature share one root.** Both exist because "which widget types can be tiles" is written down in four places. The feature (per-tile degradation) is what makes deleting the fourth copy safe: once an unknown type degrades locally, the top-level guard has no reason to know the list.
- **Deleting a validation is only safe with its replacement in the same change.** `TILE_TYPES` was doing two jobs — mirroring the widget list (badly, hence the bug) and rejecting hostile strings (silently, hence AC8). The second job is easy to miss; the `Object.prototype` case is the reason AC8 and AC10 exist.
- **`DashboardView`'s unknown-widget branch is dead code today** — the top-level guard rejects first. AC2 makes it reachable for the first time; treat it as new behaviour under test, not as existing behaviour being preserved. The empty-tiles branch at `DashboardView.tsx:13` is dead for the same reason and *stays* dead (F11 preserves `tiles.length > 0`) — do not write a test for it.
- **Order matters in `Tile`.** Nested dashboard before unknown type (the copy differs), and unknown type before the guard (there is no guard to call without an entry).
- **`build_order` notes:** `F27` (payloads.ts) precedes `F23` (widget-views.ts) so the widened `DashboardTile.type` exists before `lookupWidgetView` is typed against it; `F34` and `F31` precede `F30` so the pure pins land before the SSR test; `F36` (the category member) precedes `F35` (the preset that uses it) precedes `F37` (the story that reads it by id); and `F35` precedes the docs so the copy is confirmed by eye before it is written down.
- **AC10 is a copy improvement, not an invariant.** The no-dashboard-in-dashboard rule holds either way, because `WIDGET_VIEWS` has no `dashboard` key and `lookupWidgetView` returns `undefined` regardless. Do not implement it by rejecting `"dashboard"` in the guard — that would sink the whole dashboard on one nested tile, which is the failure this task exists to delete.
- **Probe evidence is reproducible.** `renderToString` over the current `DashboardView` with `{ data: null }` throws `Cannot read properties of null (reading 'reduce')`; the same probe confirmed React 19.2.8 routes that throw past a boundary under both `renderToString` and `renderToStaticMarkup`. Both were run in this worktree and the probe files removed.
- **Why `guard.ts` and not `guards.ts` or a shared module:** it keeps the "adding a widget only creates new files under `src/widgets/<name>/`" shape that CLAUDE.md aspires to, and gives item 2 one fewer list to reconcile.
- The lesson *"verify documentation claims against code, never against sibling docs"* applied twice here: `specs/composition-program.md` described this task accurately but missed the live bug and asserts a false CI claim, and this spec's own first draft asserted a plugin requirement that turned out to be false. Everything in Context above was verified against source, `git log`, or an executed probe.

## Future Considerations

- **Guards that report a reason.** Upgrading `isXPayload` to return `{ ok: true } | { ok: false, reason: string }` would let the invalid-tile card say *which* field failed. Natural follow-up once eleven guard modules exist in one shape; would also improve `mountWidget`'s "Could not parse the tool result."
- **Boundary on the standalone path.** Wrapping `mountWidget`'s `<View>` in `TileBoundary` closes the same hole outside dashboards for a few lines, once the boundary exists.
- **Adopt jsdom for real component tests.** With `*.test.tsx` collected, a per-file `// @vitest-environment jsdom` docblock plus one devDependency unlocks genuine boundary containment tests and interaction tests (legend mute/focus, table sort, pie "Other" expansion) that are currently untestable — relevant to composition-program items 4, 5 and 10.
- **`TESTING.md` §A5** could gain a "degraded tile" row when the manual QA checklist is next revised.
- **`specs/composition-program.md`'s CI claim** (line 354) needs correcting before later specs in the program inherit it.
- **Item 2 (`widget-registry-derivation`)** now has two fewer mirrors to reconcile: this task deletes the guard's `TILE_TYPES` and pins `WIDGET_VIEWS`, leaving `DashboardTileType` and the `render_dashboard` zod enum as the unpinned pair.

## Delivery

- **PR:** [#54 — Contain a broken dashboard tile to its own card](https://github.com/real-case/sigil/pull/54)
- **Branch:** `task/dashboard-tile-resilience` → `dev`
- **Delivered:** 2026-08-09
- **Verification:** PASS — `npm run typecheck`, `npm test` (372 tests, up from 323), `npm run build`
- **Carried forward:** the `TileBoundary` reset gap (see Self-Review Notes on the PR) needs a superseding spec — the fix requires a third prop, which the sealed contract pins against.
