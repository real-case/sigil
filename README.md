# Sigil

**Live, interactive data widgets for Claude and other MCP Apps hosts.**

> A *sigil* is a symbol that carries compressed meaning. Same idea, applied to data: a chart you can hover, click, and copy — embedded directly in your conversation, instead of a flat PNG.

Unlike existing MCP chart servers that return static images, Sigil renders **live widgets** — hover tooltips, click-to-highlight, Copy-as-CSV / PNG — inside the host's sandboxed iframe via the [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) extension.

🌐 [sigil.live](https://sigil.live) · [TESTING.md](./TESTING.md) · [INCANTATIONS.md](./INCANTATIONS.md) · [SPEC.md](./SPEC.md)

> **Status:** v0.2.0 — 10 widgets + payload-guard / registry / registration test harness.

## Demo

> Demo GIFs coming soon — once E2E-tested in Claude.

## Tools

| Tool | When it fires | Renders |
|------|---------------|---------|
| [`render_bar_chart`](#render_bar_chart) | comparing discrete categories, rankings | vertical/horizontal bars with hover tooltips, click-to-highlight |
| [`render_line_chart`](#render_line_chart) | time-series, trends, continuous data | multi-series lines with shared crosshair tooltip |
| [`render_pie_chart`](#render_pie_chart) | part-of-whole proportions, composition | pie or donut with percentage labels |
| [`render_table`](#render_table) | structured data exploration | sortable + filterable data table |
| [`render_scatter_chart`](#render_scatter_chart) | (x, y) relationships, correlation, clusters | multi-series scatter with optional point-size encoding |
| [`render_treemap`](#render_treemap) | hierarchical part-of-whole, many leaves | nested rectangles sized by value, palette-tinted by branch |
| [`render_heatmap`](#render_heatmap) | 2D categorical × numeric intensity | matrix with palette gradient, hover tooltip per cell |
| [`render_stat_panel`](#render_stat_panel) | KPIs / scorecards, at-a-glance metrics | grid of metric cards with coloured trend deltas and status accents |
| [`render_dashboard`](#render_dashboard) | several related views at once | grid of tiles, each tile any other widget rendered from its own payload |
| [`render_map`](#render_map) | country- or state-level metrics, geographic intensity | world / US-state choropleth — regions shaded by value, hover tooltip, click-to-focus |

All chart widgets expose **Copy CSV** and **Copy PNG** buttons; the table and stat panel expose **Copy CSV**. The dashboard composes other widgets, so each tile keeps its own controls.

### Optional: Ritual Mode

Sigil ships with an optional [`INCANTATIONS.md`](./INCANTATIONS.md) preset — copy it into Claude's Project Instructions and you can summon charts in ritual register:

```
Astrologers proclaim a week of Q1 sales: US 1200, EU 950, APAC 670.
View Air on monthly temperatures for Berlin and Madrid.
Animate Dead from revenue by region.
```

Includes Might & Magic homages (Town Portal, View Earth/Air, Resurrection, Scry, Animate Dead) for genre fans.

---

## Install

### Claude Desktop

Add to your Claude Desktop config (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sigil": {
      "command": "npx",
      "args": ["-y", "@real-case/sigil"]
    }
  }
}
```

Restart Claude Desktop. You should now see `sigil` in the tools list.

### VS Code (GitHub Copilot Chat)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "sigil": {
      "command": "npx",
      "args": ["-y", "@real-case/sigil"]
    }
  }
}
```

### Claude Web (Custom Connector)

Requires a Claude.ai paid plan.

1. Run Sigil in HTTP mode somewhere publicly reachable (Railway, Cloudflare Workers, or a tunnel during development).
2. In Claude → Settings → Connectors → Add custom connector → paste the HTTPS URL ending in `/mcp`.

For local development with Claude Web, use `cloudflared`:

```bash
npm run dev                                          # terminal 1 — starts on :3001
npx cloudflared tunnel --url http://localhost:3001   # terminal 2 — gives HTTPS URL
```

---

## Tool reference

### `render_bar_chart`

Render an interactive bar chart for comparing discrete categories or showing rankings. Supports vertical/horizontal orientation, hover tooltips, click-to-highlight.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title above the bars |
| `data` | `Array<{ label, value, color? }>` | yes | At least one bar |
| `data[].label` | `string` | yes | Category label |
| `data[].value` | `number` | yes | Bar length |
| `data[].color` | `string` | no | Per-bar color override (e.g. `"#6366F1"`) |
| `orientation` | `"vertical" \| "horizontal"` | no | Default `"vertical"` |
| `xlabel` | `string` | no | X-axis label |
| `ylabel` | `string` | no | Y-axis label |

### `render_line_chart`

Render an interactive line chart with one or more series. Use for time-series, trends, or any continuous numeric data.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `series` | `Array<{ name, data }>` | yes | One or more series |
| `series[].name` | `string` | yes | Series name (legend + tooltip) |
| `series[].data` | `Array<{ x, y }>` | yes | Points; `x` can be string or number |
| `xlabel` | `string` | no | X-axis label |
| `ylabel` | `string` | no | Y-axis label |

All-numeric `x` triggers a numeric axis (correct spacing for sparse values); any string switches to a category axis.

### `render_pie_chart`

Render an interactive pie or donut chart for part-of-whole proportions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `data` | `Array<{ label, value, color? }>` | yes | Slices; values must be ≥ 0 |
| `variant` | `"pie" \| "donut"` | no | Default `"donut"` |

Slices under 4% hide their inline percentage label (still visible in the tooltip).

### `render_table`

Render an interactive data table with sortable columns and text-search filtering.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Table title |
| `columns` | `Array<{ key, label, align? }>` | yes | Column definitions in display order |
| `columns[].key` | `string` | yes | Row property name |
| `columns[].label` | `string` | yes | Header text |
| `columns[].align` | `"left" \| "right" \| "center"` | no | Default: right for numeric, left otherwise |
| `rows` | `Array<Record<string, string \| number>>` | yes | Rows keyed by column.key |
| `sortable` | `boolean` | no | Default `true` |
| `filterable` | `boolean` | no | Default `true` |

### `render_scatter_chart`

Render an interactive scatter plot for showing the relationship between two numeric variables. Optional point size encodes a third metric.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `series` | `Array<{ name, data }>` | yes | One or more series; rendered in distinct palette colors |
| `series[].name` | `string` | yes | Series name (legend + tooltip) |
| `series[].data` | `Array<{ x, y, size? }>` | yes | Points; `x` and `y` are numeric; optional positive `size` |
| `xlabel` | `string` | no | X-axis label |
| `ylabel` | `string` | no | Y-axis label |

### `render_treemap`

Render an interactive treemap for hierarchical part-of-whole data with many leaves where a pie chart would be unreadable.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `data` | `Array<{ label, value, color?, children? }>` | yes | Top-level nodes; nested `children` are recursively the same shape |
| `data[].label` | `string` | yes | Node label shown in the rectangle and tooltip |
| `data[].value` | `number` | yes | Non-negative; for parents may be `0` since children sum is used |
| `data[].color` | `string` | no | Per-node color override |
| `data[].children` | same shape | no | Nested groupings |

### `render_heatmap`

Render an interactive heatmap matrix: a 2D grid where each cell's color encodes a numeric intensity. The cell color scales linearly from the surface background (low) to the primary palette accent (high), so the same gradient adapts cleanly to dark and light themes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `xLabels` | `string[]` | yes | Column labels along the x-axis |
| `yLabels` | `string[]` | yes | Row labels along the y-axis |
| `cells` | `Array<{ x, y, value }>` | yes | `x` indexes `xLabels`, `y` indexes `yLabels`, `value` is the cell intensity. Missing combinations render as empty cells. |
| `xlabel` | `string` | no | X-axis title |
| `ylabel` | `string` | no | Y-axis title |

### `render_stat_panel`

Render an interactive panel of key metrics (KPI / scorecard cards). Each card shows a headline value with an optional unit, a trend delta vs a prior period (coloured good/bad), a short description, and an optional status accent. Use for dashboards-at-a-glance: KPIs, health summaries, before/after numbers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Panel title |
| `items` | `Array<{ label, value, ... }>` | yes | Metric cards; at least one |
| `items[].label` | `string` | yes | Metric name |
| `items[].value` | `string \| number` | yes | Headline figure; numbers are grouped/formatted, strings shown as-is |
| `items[].unit` | `string` | no | Unit after the value, e.g. `ms`, `%`, `GB` |
| `items[].delta` | `number` | no | Signed change vs the comparison period; shows a coloured up/down arrow |
| `items[].deltaUnit` | `string` | no | Unit for the delta (default `%`) |
| `items[].deltaCaption` | `string` | no | Caption beside the delta, e.g. `vs last week` |
| `items[].higherIsBetter` | `boolean` | no | Whether a rising value is good — controls delta colour (default `true`) |
| `items[].description` | `string` | no | Small caption under the value |
| `items[].status` | `"success" \| "warning" \| "danger" \| "info"` | no | Optional semantic accent bar (and badge colour) |
| `items[].trend` | `number[]` | no | Recent values (oldest→newest) drawn as a compact sparkline |
| `items[].target` | `number` | no | Goal for the metric; with a numeric value, draws a progress bar |
| `items[].badge` | `string` | no | Short status pill next to the label, coloured by `status` |
| `columns` | `number` | no | Fixed column count (1–4); defaults to an auto-fit grid |

### `render_dashboard`

Render a multi-widget dashboard: a grid of tiles where each tile is one of the other Sigil widgets, rendered from its own payload. Use to show several related views at once — e.g. a KPI row above a couple of charts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Dashboard title |
| `columns` | `number` | no | Grid column count (1–4); defaults to `2` |
| `tiles` | `Array<{ type, payload, colSpan? }>` | yes | Ordered tiles, laid out left-to-right, top-to-bottom |
| `tiles[].type` | `"bar-chart" \| "line-chart" \| "pie-chart" \| "table" \| "scatter-chart" \| "treemap" \| "heatmap" \| "stat-panel" \| "map"` | yes | Which widget to render |
| `tiles[].payload` | `object` | yes | That widget's own payload — the same object its `render_<type>` tool accepts |
| `tiles[].colSpan` | `number` | no | How many columns the tile spans (1..`columns`); defaults to `1` |

### `render_map`

Render an interactive map with two encodings: a **choropleth** (regions shaded by value, from `data`) or **bubbles** (sized markers at coordinates, from `points`). Use choropleth for per-region intensity (population, GDP, counts by country/state); use bubbles for point data (cities, offices, events). Hover for the exact value; on a choropleth, click to focus a region.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title above the map |
| `scope` | `"world" \| "us-states"` | no | Base map: world countries or US states. Defaults to `"world"` |
| `variant` | `"choropleth" \| "bubble"` | no | Encoding. Defaults to `"choropleth"` |
| `data` | `Array<{ id, value, label? }>` | choropleth | One entry per region (required for `choropleth`) |
| `data[].id` | `string` | yes | **World:** ISO 3166-1 alpha-3 (preferred, e.g. `"USA"`), alpha-2, numeric, or common English name. **US states:** USPS code (preferred, e.g. `"CA"`), full name, or FIPS |
| `data[].value` | `number` | yes | Numeric value shading the region (negatives supported) |
| `data[].label` | `string` | no | Display-name override for the tooltip |
| `points` | `Array<{ lat, lon, value, label? }>` | bubble | One marker per point (required for `bubble`) |
| `points[].lat` / `points[].lon` | `number` | yes | Coordinates in degrees |
| `points[].value` | `number` | yes | Non-negative magnitude; marker **area** scales with it |
| `points[].label` | `string` | no | Label shown in the tooltip |
| `valueLabel` | `string` | no | Label for the value in the tooltip and legend, e.g. `"GDP per capita"` |

Geometry is the bundled [world-atlas](https://github.com/topojson/world-atlas) / [us-atlas](https://github.com/topojson/us-atlas) TopoJSON, projected with `d3-geo` (Natural Earth for the world, Albers USA for states). Choropleth uses the heatmap colour scale; bubbles are area-proportional with a size legend. Both adapt to dark/light themes. Regions with no matching datum stay a neutral land colour; unmatched ids (or points that fall off the map) are reported below it.

---

## Development

```bash
npm install
npm run dev                 # HTTP server on :3001 (for Claude Web via cloudflared)
npm run dev:stdio           # stdio server (for Claude Desktop / VS Code)
npm run dev:sandbox         # in-browser widget sandbox — pick any widget + preset, toggle theme / viewport / debug overlay
npm run typecheck           # tsc --noEmit
npm test                    # vitest: payload guards, registry, tool registration
npm run build               # bundle 10 widgets + compile server
npm start                   # run compiled HTTP server
npm run start:stdio         # run compiled stdio server
```

### Architecture overview

```
src/
├── server.ts             # HTTP entry (Express + StreamableHTTPServerTransport)
├── stdio.ts              # stdio entry — npx sigil
├── mcp-server.ts         # shared factory — registers tools + resources
├── tools/                # tool definitions + input schemas
│   ├── bar-chart.ts
│   ├── line-chart.ts
│   ├── pie-chart.ts
│   ├── table.ts
│   ├── scatter-chart.ts
│   ├── treemap.ts
│   └── heatmap.ts
├── resources/            # ui:// resource serving for bundled widget HTMLs
├── registry.ts           # single source of truth — server tools, resources, build
├── shared/payloads.ts    # contract types between server and widgets
├── __tests__/            # vitest suites: registry, payload guards, registration
└── widgets/              # React + Recharts widget entries
    ├── shared/           # theme tokens, export utils, Toolbar, mountWidget shell
    ├── bar-chart/
    ├── line-chart/
    ├── pie-chart/
    ├── table/
    ├── scatter-chart/
    ├── treemap/
    └── heatmap/          # hand-rolled SVG (no Recharts)
```

Each widget bundles to a standalone single-file HTML via Vite + `vite-plugin-singlefile`, then gets served as a `ui://sigil/<widget>` resource by the MCP server. The host renders it in a sandboxed iframe and communicates with it via `postMessage` per the MCP Apps spec.

---

## License

MIT — see [LICENSE](./LICENSE).
