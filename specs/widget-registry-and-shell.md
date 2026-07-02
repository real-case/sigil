# Task: Widget Registry + WidgetShell
Type: feature
Created: 2026-05-05
Status: ready

## Goal

Refactor widget plumbing so adding a 5th widget requires creating **only new files** — no edits to enumeration lists. Two coupled refactors:

1. **Server-side widget registry** — collapse the four duplicated widget enumerations (`src/tools/index.ts`, `src/resources/index.ts`, `vite.config.ts`, `package.json` `build:widgets`) into one `src/registry.ts`.
2. **`mountWidget` HOC** — extract the ~30 lines of identical boilerplate (guard, `extractPayload`, `Status`, `useApp` + `app.ontoolresult`, `createRoot`) from each of the four `App.tsx` files into `src/widgets/shared/widget-shell.tsx`.

## Context

### Affected files

**Edit (server / build):**
- `src/tools/index.ts` — replace explicit `register*Tool()` calls with `WIDGETS.forEach(w => w.register(server))`.
- `src/resources/index.ts` — replace local `WIDGETS` array with import from the new registry; reuse `name` as `distSubpath`.
- `vite.config.ts` — replace local `WIDGETS` const; derive widget names from registry. `palette-preview` stays as a special case (dev-only, no payload, no tool, no UI URI).
- `package.json` — `build:widgets` script becomes `tsx scripts/build-widgets.ts`.

**New:**
- `src/registry.ts` — single `WIDGETS` array of `{ name, uri, register, distSubpath }`.
- `src/widgets/shared/widget-shell.tsx` — `mountWidget<P>({ name, isPayload, View })` HOC.
- `scripts/build-widgets.ts` — iterates registry, spawns `vite build` per widget.

**Edit (per widget — App.tsx only; Views untouched):**
- `src/widgets/bar-chart/App.tsx`
- `src/widgets/line-chart/App.tsx`
- `src/widgets/pie-chart/App.tsx`
- `src/widgets/table/App.tsx`

Each `App.tsx` shrinks from ~90–110 lines to ~15–25 (imports + guard + `mountWidget` call).

### Related patterns

- All four current `App.tsx` files differ only in: imported View, payload type + guard, `appInfo.name`, and one human-readable noun in status messages. Diffed line-by-line — no other variation.
- `src/widgets/shared/{theme.ts, Toolbar.tsx, export-utils.ts, styles.css}` already share cross-widget concerns; the shell fits naturally beside them.
- `palette-preview` is a dev-only widget that doesn't go through the MCP pipeline (no payload, no tool, no UI URI). It must continue to build via `WIDGET=palette-preview vite` for `dev:preview` but is intentionally excluded from the production widget list.

### Dependencies

- No new dependencies. `tsx` (already devDependency) runs the new TS build script.
- No version bumps.

## Chosen Approach

### Registry (`src/registry.ts`)

```ts
import { registerBarChartTool, BAR_CHART_UI_URI } from "./tools/bar-chart.js";
import { registerLineChartTool, LINE_CHART_UI_URI } from "./tools/line-chart.js";
import { registerPieChartTool, PIE_CHART_UI_URI } from "./tools/pie-chart.js";
import { registerTableTool, TABLE_UI_URI } from "./tools/table.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface WidgetEntry {
  name: string;       // dist subpath + slug used by build tooling
  uri: string;        // ui:// resource URI
  register: (server: McpServer) => void;
}

export const WIDGETS: readonly WidgetEntry[] = [
  { name: "bar-chart",  uri: BAR_CHART_UI_URI,  register: registerBarChartTool },
  { name: "line-chart", uri: LINE_CHART_UI_URI, register: registerLineChartTool },
  { name: "pie-chart",  uri: PIE_CHART_UI_URI,  register: registerPieChartTool },
  { name: "table",      uri: TABLE_UI_URI,      register: registerTableTool },
] as const;
```

Static array — explicit, no build-tool magic.

### `mountWidget` (`src/widgets/shared/widget-shell.tsx`)

```ts
export interface MountWidgetOptions<P> {
  name: string;                                   // appInfo name, e.g. "sigil-bar-chart"
  isPayload: (value: unknown) => value is P;      // type guard
  View: React.ComponentType<{ payload: P }>;
}

export function mountWidget<P>(opts: MountWidgetOptions<P>): void {
  installThemeStyles();
  // …inner App: useState<P|null>, useState<string|null> for parseError,
  //   useApp({ appInfo: { name: opts.name, version: "0.1.0" }, capabilities: {},
  //     onAppCreated: (app) => { app.ontoolresult = (params) => { … } } })
  //   if (error) → connection-error Status
  //   if (parseError) → parseError Status
  //   if (!isConnected) → "Connecting…" Status
  //   if (!payload) → "Waiting for data…" Status
  //   else → <View payload={payload} />
  // createRoot(document.getElementById("root")!).render(<App />)
}
```

Generic in `P`. `extractPayload` (the structuredContent → content[0].text JSON fallback) lives inside the shell module, parameterized by `isPayload`.

### Each `App.tsx` (post-refactor, bar-chart example)

```ts
import { BarChartView } from "./BarChartView.js";
import type { BarChartPayload, BarDatum } from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

function isBarDatum(v: unknown): v is BarDatum { /* unchanged */ }
function isBarChartPayload(v: unknown): v is BarChartPayload { /* unchanged */ }

mountWidget({
  name: "sigil-bar-chart",
  isPayload: isBarChartPayload,
  View: BarChartView,
});
```

### Build script (`scripts/build-widgets.ts`)

Imports `WIDGETS`; for each entry runs `vite build` with `WIDGET=<name>` in env. Exits non-zero on first failure.

```ts
import { spawnSync } from "node:child_process";
import { WIDGETS } from "../src/registry.js";

for (const w of WIDGETS) {
  const result = spawnSync("vite", ["build"], {
    stdio: "inherit",
    env: { ...process.env, WIDGET: w.name },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
```

`package.json`: `"build:widgets": "tsx scripts/build-widgets.ts"`.

### `vite.config.ts` adjustment

Imports widget names from registry. `palette-preview` stays whitelisted as a dev-only special case (already not in production build).

```ts
import { WIDGETS } from "./src/registry.js";

const PRODUCTION_WIDGETS = WIDGETS.map(w => w.name);
const ALL_WIDGETS = [...PRODUCTION_WIDGETS, "palette-preview"];
const widget = (process.env.WIDGET ?? "bar-chart") as string;
if (!ALL_WIDGETS.includes(widget)) {
  throw new Error(`Unknown WIDGET="${widget}". Expected one of: ${ALL_WIDGETS.join(", ")}`);
}
```

The export `WIDGETS` from `vite.config.ts` is no longer needed (was unused outside the file).

**Stack compliance:** NATIVE
**Future alignment:** N/A — no `VISION.md` in the project root.

**Stack extensions required:** none.

**Why this over alternatives:**

- **Widget-side registry that imports all Views (rejected):** would break per-widget tree-shaking — each single-file iframe bundle would inline every widget's Recharts code, blowing up bundle sizes. The duplications we're killing all live on the server / build-tool side anyway.
- **`import.meta.glob` auto-discovery (rejected):** couples the project to Vite at every consumer, including the server runtime and the build script — `import.meta.glob` is a Vite feature, not a Node primitive. Static array works everywhere with no magic.
- **Side-effect module registration (rejected):** each tool file would call `registerWidget(this)` on import. Order-dependent, harder to debug, and forces the registry to be mutable global state.
- **Render-prop `<WidgetShell>{(p) => <View payload={p} />}</WidgetShell>` (rejected):** every `App.tsx` would have to repeat `createRoot(...)` + JSX boilerplate. HOC encapsulates the entire mount in one call.
- **Dynamic dispatch by name (rejected):** `mountWidget("bar-chart")` with the shell looking up the View internally requires the shell to import all Views — same tree-shake regression as the widget-side registry.
- **Guard derived from Zod input schema (rejected):** server Zod describes the tool input; payloads add resolved defaults (e.g. `orientation: "vertical"` after `?? "vertical"`) that aren't part of the input schema. Derivation would also drag Zod into every widget bundle.
- **Guard inside the registry entry (rejected):** would force the server registry to import widget-side runtime types, polluting the server bundle.

## Acceptance Criteria

- [ ] `npm run typecheck` passes after the refactor. **`tsconfig.json` is updated to include `scripts/**/*.ts`** so the new build script is also typechecked (otherwise the typecheck AC would silently miss it).
- [ ] `npm run build` (i.e. `build:widgets` + `build:server`) builds all 4 production widgets without errors.
- [ ] All 4 production widget bundles change in size by no more than ±5% from the pre-refactor baseline. **The baseline is recorded in a separate `chore: record baseline bundle sizes` commit on `main` *before* step 1**, so the ±5% gate compares against unmodified `main`, not against an already-modified build path.
- [ ] Each `App.tsx` is at least 50% shorter than before (measured by line count). The 50% rule is the only line-count gate; no absolute bound — table will likely land at ~50–55 lines because it has three guard helpers (vs. two for the others), and that's fine.
- [ ] `src/tools/index.ts`, `src/resources/index.ts`, `vite.config.ts`, and `package.json` `build:widgets` no longer enumerate widgets explicitly — each refers to the registry once (or, in the case of `package.json`, to `tsx scripts/build-widgets.ts` which itself uses the registry). `src/tools/index.ts` and `src/resources/index.ts` keep their existing exported wrappers (`registerAllTools`, `registerAllResources`); only their internals change. `src/mcp-server.ts` is not edited.
- [ ] `npm run dev:preview` (`WIDGET=palette-preview`) still launches successfully — palette-preview is unaffected.
- [ ] Visual smoke test via `npm run dev:preview` confirms hover, click-to-highlight, tooltips, Copy CSV, Copy PNG, dark-mode all still work for bar-chart and pie-chart Views (palette-preview embeds both).
- [ ] **Demo (verified by inspection of `git show --stat`):** a 5th stub widget `empty-state` is added in a separate commit; its diff is **only new files** plus a one-line addition to `WIDGETS` in `src/registry.ts` and an `EmptyStatePayload` addition in `src/shared/payloads.ts`. New files: `src/tools/empty-state.ts`, `src/widgets/empty-state/{App.tsx, EmptyStateView.tsx, index.html}`. **No edits** to `src/tools/index.ts`, `src/resources/index.ts`, `vite.config.ts`, `package.json`, or `scripts/build-widgets.ts`. Stub is removed in a follow-up commit. Acknowledged: this AC is procedural — verified by reading the diff, not automated.
- [ ] Commits are split per logical step: (0) baseline bundle sizes, (1) registry + build script, (2) `mountWidget` shell, (3) migrate 4 widgets + collapse server lists, (4) demo stub add, (5) demo stub remove. No monolithic commit.

## Non-goals

- **No changes to public contracts.** `src/shared/payloads.ts` payload shapes are untouched; the only addition allowed is a new `EmptyStatePayload` for the demo stub (added then removed).
- **No changes to Recharts markup** inside any `*View.tsx`.
- **No changes to** `src/server.ts`, `src/stdio.ts`, `src/mcp-server.ts`.
- **No changes to** `src/widgets/shared/{theme.ts, Toolbar.tsx, export-utils.ts, styles.css}`.
- **No changes to the palette / design tokens.**
- **No new dependencies; no version bumps.**
- **No changes to the npm package name, version, or publishing config.**
- **No changes to Zod input schemas** in `src/tools/*.ts` (only the registry consolidates their `register*Tool` exports; the schemas themselves are untouched).
- **No introduction of a generic widget DSL** (e.g., declarative widget descriptors that auto-generate Views). Out of scope — a 5th real widget today still writes its own View by hand.
- **No tests added.** This is structurally a no-op refactor; existing manual / typecheck / build verification covers the change. Adding a test harness is a separate task.

## Future Considerations

- **Per-widget kind label.** The shell uses generic status messages ("Waiting for data…", "Could not parse the tool result."). If a widget later needs a custom noun (e.g., "Loading sankey…"), add an optional `kind?: string` field to `MountWidgetOptions`. Not done now — premature.
- **Server-side payload validation.** Currently the server returns a payload it built itself; the widget re-validates it client-side. The widget guard exists because the iframe boundary is a trust boundary for the spec, not because we suspect the server. A shared Zod-derived guard could replace the hand-written ones later, but only if we accept Zod in widget bundles or generate code at build time.
- **Auto-discovery via filesystem.** Once the registry pattern is in place, a future task could replace the explicit `WIDGETS` array with `readdirSync("./src/widgets")` + a convention (each dir exports a registry entry from `index.ts`). Defer until widget count justifies it; explicit list still wins for legibility at N=4–10.
- **Type guard generation.** A small codegen step that derives `isPayload` functions from TypeScript types would eliminate the last per-widget hand-written code. Not pursued now — `ts-morph` / `tsx-runtime-validators` would be a new dep.
- **`palette-preview` integration.** It currently lives outside the registry (dev-only, no payload). If we ever want a unified preview harness that iterates production widgets with mock payloads, the registry could grow a `mockPayload?: P` field. Not done now.

## Design Notes

### Implementation order (one commit per step)

0. **Record baseline bundle sizes.** On unmodified `main`: `npm run build` then `du -b dist/widgets/*/index.html`. Commit message body lists the four numbers. This commit makes no functional changes — it's a marker so the ±5% gate compares against pristine `main`.
1. **Add registry + build script.** Create `src/registry.ts` and `scripts/build-widgets.ts`. Update `package.json` `build:widgets` to call `tsx scripts/build-widgets.ts`. Update `vite.config.ts` to derive widget names from the registry. Update `tsconfig.json` `include` to add `scripts/**/*.ts` so the new script is typechecked. **Do not** touch `tools/index.ts` or `resources/index.ts` yet — verify the registry compiles standalone, build still produces the same 4 bundles within ±5% of step 0.
2. **Add `mountWidget` shell.** Create `src/widgets/shared/widget-shell.tsx`. **Do not** migrate widgets yet — verify it typechecks in isolation.
3. **Migrate widgets + collapse server lists.** Rewrite each `App.tsx` to use `mountWidget`. Replace the explicit `register*Tool` calls in `src/tools/index.ts` (keep the `registerAllTools` wrapper export — change only its body) with iteration over the registry. Same for `src/resources/index.ts` (keep `registerAllResources` wrapper, replace internal `WIDGETS` array). Verify typecheck + build + visual smoke test.
4. **Demo: add `empty-state` stub.** New files only, plus the registry append + a payload type. Verify build produces a 5th bundle. Confirm via `git show --stat` that the diff matches the AC.
5. **Remove the stub.** Delete the empty-state files; revert the registry line and the payload type. Confirms reversibility.

### Open assumption: `name === distSubpath`

Today, `src/resources/index.ts` carries `{ name, uri, distSubpath }` where `name === distSubpath` for all four widgets. The new `WidgetEntry` collapses these into `name` only. **This bakes in the invariant that a widget's logical name equals its dist directory name.** If a future widget needs a different layout, re-introduce a `distSubpath?: string` field at that point — trivial. Not pre-empting now.

### Subtleties

- **`vite.config.ts` transitively loads MCP SDK.** Importing the registry from the vite config means esbuild loads `@modelcontextprotocol/{sdk,ext-apps/server}` at config-load time. They're real npm packages — load is ~tens of ms — accepted as the cost of one source of truth. **Concrete rollback signal:** if `npm run dev:preview` cold start regresses by more than 500 ms (against the same `time` measurement on `main` taken at step 0), or if `npm run build` fails with an esbuild config-load error, split the registry into `src/widgets-list.ts` (names + URIs only, no SDK imports) consumed by `vite.config.ts`, and keep `src/registry.ts` (with registrars) for server use. The split is a 10-minute follow-up; we don't pre-empt it.
- **`package.json` build:widgets script.** Replacing the bash for-loop with `tsx scripts/build-widgets.ts` adds a dependency on `tsx` for the build step, but `tsx` is already a devDep used for `dev` and `dev:stdio`.
- **Status message wording.** Going from per-widget noun ("Waiting for chart data…" / "Waiting for table data…") to generic ("Waiting for data…") is a minor copy change. Acceptable; widgets are never visible side-by-side, so the user never sees the inconsistency anyway.
- **Bundle size measurement.** Run `npm run build` on `main` first, record `du -b dist/widgets/*/index.html`. Run after step 3 (full migration), compare. ±5% gate applies to each widget independently.
- **Type inference flow.** The HOC must be generic in `P` so a mismatch between `isPayload` and `View` is a compile error. Verified in head:
  ```ts
  declare function mountWidget<P>(opts: {
    name: string;
    isPayload: (v: unknown) => v is P;
    View: React.ComponentType<{ payload: P }>;
  }): void;
  // mountWidget({ name, isPayload: isBarChartPayload, View: TableView })  // ❌
  // mountWidget({ name, isPayload: isBarChartPayload, View: BarChartView }) // ✅
  ```
- **The `installThemeStyles()` side effect.** Each App.tsx currently calls it at module top level. Moving the call inside `mountWidget` preserves the timing (still runs before React mounts).
- **Dev-only `palette-preview`.** Its `App.tsx` does not use `useApp` (no MCP pipeline), so it does not migrate to `mountWidget`. Stays as-is. The registry and build script intentionally exclude it.
