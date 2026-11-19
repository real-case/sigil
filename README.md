# Sigil

**Live, interactive data widgets for Claude and other MCP Apps hosts.**

> A *sigil* is a symbol that carries compressed meaning. Same idea, applied to data: a chart you can hover, click, and copy — embedded directly in your conversation, instead of a flat PNG.

Unlike existing MCP chart servers that return static images, Sigil renders **live widgets** — hover tooltips, click-to-highlight, Copy-as-CSV / PNG — inside the host's sandboxed iframe via the [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) extension.

🌐 [sigil.live](https://sigil.live) · [TESTING.md](./TESTING.md) · [INCANTATIONS.md](./INCANTATIONS.md) · [SPEC.md](./SPEC.md)

> **Status:** v0.2.0 — 15 widgets + payload-guard / registry / registration test harness.

## Demo

> Demo GIFs coming soon — once E2E-tested in Claude.

## Tools

| Tool | When it fires | Renders |
|------|---------------|---------|
| [`render_bar_chart`](#render_bar_chart) | comparing discrete categories, rankings, parts of a total | vertical/horizontal bars; grouped, stacked and 100% stacked multi-series; line overlay; target lines and bands; waterfall bridges |
| [`render_line_chart`](#render_line_chart) | time-series, trends, continuous data | multi-series lines with shared crosshair tooltip; previous-period comparison, targets, event annotations, incomplete-period tail; dash patterns or small multiples for many series |
| [`render_pie_chart`](#render_pie_chart) | part-of-whole proportions, composition | pie or donut with percentage labels |
| [`render_table`](#render_table) | structured data exploration | sortable + filterable data table |
| [`render_scatter_chart`](#render_scatter_chart) | (x, y) relationships, correlation, clusters | multi-series scatter with optional point-size encoding and per-series marker shapes |
| [`render_treemap`](#render_treemap) | hierarchical part-of-whole, many leaves | nested rectangles sized by value, palette-tinted by branch |
| [`render_heatmap`](#render_heatmap) | 2D categorical × numeric intensity, retention cohorts | matrix with palette gradient, hover tooltip per cell; cohort mode with a size column and a weighted average row; calendar mode for one value per day |
| [`render_stat_panel`](#render_stat_panel) | KPIs / scorecards, at-a-glance metrics | grid of metric cards with coloured trend deltas and status accents; sparklines on a shared scale on request |
| [`render_sankey`](#render_sankey) | source-to-destination flows: budgets, user journeys, traffic | flow ribbons between stages, width ∝ value, hover-highlighting of connected flows |
| [`render_dashboard`](#render_dashboard) | several related views at once | responsive grid of tiles, each tile any other widget rendered from its own payload; sections, source / as-of footnotes, layout templates for RED, USE, SaaS KPIs and product analytics |
| [`render_map`](#render_map) | country- or state-level metrics, geographic intensity | world / US-state choropleth — regions shaded by value, hover tooltip, click-to-focus |
| [`render_funnel`](#render_funnel) | conversion funnels, drop-off, pipeline stages | ordered stage bars with conversion from first and previous stage, largest drop called out |
| [`render_info_card`](#render_info_card) | value vs target, health thresholds, leaderboards, period comparisons, short summaries | bullet, gauge, progress, ranking, comparison and narrative cards; status always printed in words |
| [`render_distribution`](#render_distribution) | spread, percentiles, skew, outliers; comparing variability across groups | histogram (raw values or pre-computed buckets, groups stacked on shared scales) or box plots (raw values or five-number summaries), with SLO / target markers |
| [`render_timeline`](#render_timeline) | schedules, phases, incident windows, service state over time | Gantt-style bars in lanes or a state timeline coloured by state, with milestones and a "now" line |

All chart widgets (including distribution and timeline) expose **Copy CSV** and **Copy PNG** buttons; the table, stat panel and info card expose **Copy CSV**. The dashboard composes other widgets, so each tile keeps its own controls.

**Drill-down.** On a host that accepts messages from a widget (MCP Apps `hostCapabilities.message`), clicking a bar, point, slice, funnel step, heatmap cell or calendar day, histogram bucket or box, timeline bar, or table row opens a small menu of follow-up questions — "Break down…", "Why is it like this?", "Show rows" — and the one picked is sent to the model as your next message, naming the mark and the chart. Bar, line, pie, funnel, heatmap, distribution, timeline and table accept an optional `followUps: string[]` to replace those defaults with questions about the data's real dimensions. On other hosts there is no menu and a click behaves as before.

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

The HTTP server binds to `127.0.0.1` and rejects browser requests from non-localhost origins. To allow a hosted deployment's web origin, set `ALLOWED_ORIGINS` (comma-separated, exact match). Note that `HOST=0.0.0.0` disables the SDK's DNS-rebinding host check and the server has **no authentication of its own** — never expose it without a proxy/auth layer in front.

---

## Tool reference

### `render_bar_chart`

Render an interactive bar chart for comparing discrete categories or showing rankings. Supports vertical/horizontal orientation, hover tooltips, click-to-highlight. Pass `series` instead of `data` for several values per category.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title above the bars |
| `variant` | `"bars" \| "waterfall"` | no | Default `"bars"`. `"waterfall"` draws `data` as a bridge — see below |
| `data` | `Array<{ label, value, color?, kind? }>` | one of `data` / `series` | Single-series bars, at least one |
| `data[].label` | `string` | yes | Category label |
| `data[].value` | `number` | yes | Bar length |
| `data[].color` | `string` | no | Per-bar color override (e.g. `"#6366F1"`) |
| `data[].kind` | `"delta" \| "total"` | no | Waterfall only. Default `"delta"`: a signed change from the running total. `"total"`: a level standing on zero that restarts the running total (opening balance, known subtotal) |
| `totalLabel` | `string` | no | Waterfall only: label of the computed closing bar; default `"Total"` |
| `series` | `Array<{ name, data, color?, mark?, axis? }>` | one of `data` / `series` | Multi-series bars; categories are the union of every series' labels, in first-seen order |
| `series[].data` | `Array<{ label, value }>` | yes | One value per category; may be negative |
| `series[].color` | `string` | no | Series color; wins over the palette |
| `series[].mark` | `"bar" \| "line"` | no | Default `"bar"`. `"line"` draws the series as a line over the bars (never stacked) |
| `series[].axis` | `"left" \| "right"` | no | Default `"left"` (shared axis). `"right"` is for a different unit only and requires `ylabelRight` |
| `stack` | `"none" \| "normal" \| "percent"` | no | Multi-series only. Default `"none"` (grouped). `"normal"` stacks to a total, negative parts below zero; `"percent"` stacks to 100% |
| `orientation` | `"vertical" \| "horizontal"` | no | Default `"vertical"`. Line marks and a right axis need `"vertical"` |
| `xlabel` | `string` | no | X-axis label |
| `ylabel` | `string` | no | Y-axis label |
| `ylabelRight` | `string` | no | Right-axis label; required with `axis: "right"` |
| `reference` | `Array<ReferenceMark>` | no | Target lines and bands — see [Reference marks](#reference-marks) |

**Waterfall.** With `variant: "waterfall"` each `data` item floats from where the running total stood: rises blue, falls orange (the two arms of the diverging scale, safe for red–green colour blindness), totals neutral grey, every change labelled with its sign, and a dashed connector at the level each step ended on. The closing bar is computed — start plus every change — and appended unless the last item is already a `total`; the header KPI is that closing value. A waterfall takes `data`, not `series`; the tooltip shows the change and the running total; `reference` lines work as on ordinary bars.

`data` and `series` are mutually exclusive. In multi-series mode the chart shows a numeric axis instead of the single-series value labels, the header KPI is the sum of every bar (`net total` once any value is negative), percent values use the pie chart's share format, and the tooltip lists every series in the hovered category plus the stack total.

### `render_line_chart`

Render an interactive line chart with one or more series. Use for time-series, trends, or any continuous numeric data.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `series` | `Array<{ name, data, compare? }>` | yes | One or more series |
| `series[].name` | `string` | yes | Series name (legend + tooltip) |
| `series[].data` | `Array<{ x, y }>` | yes | Points; `x` can be string or number |
| `series[].compare` | `{ label?, data: Array<{ x, y }> }` | no | Comparison baseline (previous period, last year, plan), matched to the series by `x`. Drawn as a faint dashed line in the series' color; the tooltip adds the baseline and the change in absolute and % terms |
| `series[].dash` | `"solid" \| "dashed" \| "dotted" \| "dash-dot"` | no | Stroke pattern for this series; overrides `patterns` |
| `xlabel` | `string` | no | X-axis label |
| `ylabel` | `string` | no | Y-axis label |
| `reference` | `Array<ReferenceMark>` | no | Target lines and bands — see [Reference marks](#reference-marks) |
| `annotations` | `Array<{ x, label, x2? }>` | no | Event markers: a vertical line at `x`, or a shaded region `x`..`x2`, labelled |
| `partialFrom` | `string \| number` | no | First `x` of an incomplete period; the line is dashed from there and the tooltip marks those points incomplete |
| `patterns` | `boolean` | no | Give every series after the first its own dash pattern as well as its colour (secondary encoding). The legend shows the pattern |
| `facet` | `boolean` | no | Small multiples: one small panel per series, all on the same x values and the same y range, instead of an overlay |

All-numeric `x` triggers a numeric axis (correct spacing for sparse values); any string switches to a category axis. With a `compare` baseline on the first series, the header KPI caption adds the change in average against it. Under Windows High Contrast (forced colours) every series gets a dash pattern automatically, because the system paints them all one colour.

### `render_pie_chart`

Render an interactive pie or donut chart for part-of-whole proportions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `data` | `Array<{ label, value, color? }>` | yes | Slices; values must be ≥ 0 |
| `variant` | `"pie" \| "donut"` | no | Default `"donut"` |
| `maxSegments` | `number` | no | Max rendered slices (integer ≥ 2, default `5`). Extra slices collapse into a click-to-expand "Other" |

When `data` has more than `maxSegments` entries, the smallest slices collapse into a single muted "Other" slice — click it (or its legend row) to expand the full set; a "Show top N" button collapses back. The cap is visual only: Copy CSV always exports every original row.

### `render_table`

Render an interactive data table with sortable columns and text-search filtering.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Table title |
| `columns` | `Array<{ key, label, align?, kind? }>` | yes | Column definitions in display order |
| `columns[].key` | `string` | yes | Row property name |
| `columns[].label` | `string` | yes | Header text |
| `columns[].align` | `"left" \| "right" \| "center"` | no | Default: right for numeric, left otherwise (center for sparkline) |
| `columns[].kind` | `"text" \| "sparkline"` | no | Default `"text"`. `"sparkline"` renders each cell's number array (oldest → newest) as a 56×16 inline trend line with the latest value beside it |
| `rows` | `Array<Record<string, string \| number \| number[]>>` | yes | Rows keyed by column.key; number arrays only under sparkline columns |
| `sortable` | `boolean` | no | Default `true` |
| `filterable` | `boolean` | no | Default `true` |

Sorting a sparkline column orders rows by each series' last value; the text filter ignores digits inside sparklines; Copy CSV exports each series as one joined `"1,2,3"` cell.

### `render_scatter_chart`

Render an interactive scatter plot for showing the relationship between two numeric variables. Optional point size encodes a third metric.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `series` | `Array<{ name, data }>` | yes | One or more series; rendered in distinct palette colors |
| `series[].name` | `string` | yes | Series name (legend + tooltip) |
| `series[].data` | `Array<{ x, y, size? }>` | yes | Points; `x` and `y` are numeric; optional positive `size` |
| `series[].shape` | `"circle" \| "square" \| "triangle" \| "diamond" \| "cross" \| "star"` | no | Marker shape for this series; overrides `shapes` |
| `xlabel` | `string` | no | X-axis label |
| `ylabel` | `string` | no | Y-axis label |
| `reference` | `Array<ReferenceMark>` | no | Threshold lines and bands (numeric values only) — see [Reference marks](#reference-marks) |
| `shapes` | `boolean` | no | Give each series its own marker shape as well as its colour; the legend shows the shape. Recommended past three series. Always on under forced colours |


### Reference marks

`render_bar_chart`, `render_line_chart` and `render_scatter_chart` share one optional `reference` field for authored context: targets, thresholds, averages, acceptable ranges.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `axis` | `"x" \| "y"` | yes | `"y"` is the value axis (on a horizontal bar chart too); `"x"` the category / x axis |
| `kind` | `"line" \| "band"` | yes | A line at `value`, or a band from `from` to `to` |
| `value` | `number \| string` | for `line` | Position of the line |
| `from`, `to` | `number \| string` | for `band` | Ends of the band |
| `label` | `string` | no | Text drawn with the mark; strongly recommended, since a band must not rely on color alone |
| `tone` | `"neutral" \| "success" \| "warning" \| "danger"` | no | Default `"neutral"`; maps to the theme's status colors |

A value-axis mark beyond the data widens the axis rather than disappearing. Reference marks take no clicks and no tab stop.

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

Render an interactive heatmap matrix: a 2D grid where each cell's color encodes a numeric intensity. By default the color follows a sequential single-hue ramp (light → dark for low → high; the dark theme inverts it so large values come forward). For values with a meaningful centre — change vs plan, growth rates, correlations — `scale: "diverging"` colours below `midpoint` blue and above it orange, with a neutral grey at the midpoint itself.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `xLabels` | `string[]` | yes, except calendar | Column labels along the x-axis |
| `yLabels` | `string[]` | yes, except calendar | Row labels along the y-axis |
| `cells` | `Array<{ x, y, value }>` | yes, except calendar | `x` indexes `xLabels`, `y` indexes `yLabels`, `value` is the cell intensity. Missing combinations render as empty cells. |
| `xlabel` | `string` | no | X-axis title |
| `ylabel` | `string` | no | Y-axis title |
| `scale` | `"sequential" \| "diverging"` | no | Colour scale. Defaults to `"sequential"` |
| `midpoint` | `number` | no | Diverging only: the value shown as neutral (default `0`). The farther side sets the extremes; the nearer side is not stretched |
| `mode` | `"matrix" \| "cohort" \| "calendar"` | no | Default `"matrix"`. `"cohort"` reads the grid as a retention table, `"calendar"` lays out `days` — see below |
| `cohortSizes` | `number[]` | no | Cohort mode: one size per `yLabels` row, shown as a size column and used to weight the average row |
| `days` | `Array<{ date, value }>` | calendar (required) | One entry per day, `date` as `YYYY-MM-DD`; up to 1,200 days |
| `weekStart` | `"monday" \| "sunday"` | no | Calendar mode: the first weekday row (default `"monday"`) |
| `valueLabel` | `string` | no | Calendar mode: what the values count, e.g. `"commits"` |

**Cohort mode.** Rows are cohorts (signup month), columns are periods since start (`M0`, `M1`, …), and each cell is a percentage — values above 100 are fine for net revenue retention. The widget prints the % in every cell (with whichever of two inks clears 4.5:1 on that colour), adds a size column when `cohortSizes` is given, and appends an average row. The average for each period covers only the cohorts that reached it, weighted by cohort size when sizes are given ("Weighted avg") and a plain mean otherwise ("Average"). Periods a cohort has not reached are simply omitted from `cells` and stay empty, so the table keeps its triangle; they are never drawn as 0. On a narrow host the table scrolls sideways rather than shrinking cells below their printed value.

**Calendar mode.** One value per day, laid out as weeks (columns) by weekdays (rows) with month labels — the contribution-graph layout. Up to 53 weeks draw as one continuous block; a longer span gets one block per calendar year. Dates are read in UTC, so a day never shifts with the viewer's time zone. A day inside the range that `days` leaves out is drawn as "no data", never as 0. The same `scale` / `midpoint` options apply, so a diverging calendar of "orders vs plan" works like a diverging matrix. Arrow keys move by day (up / down) and by week (left / right).

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
| `trendScale` | `"own" \| "shared"` | no | Default `"own"`: each sparkline fits its own range. `"shared"`: one range for every card, so cards of the same measure read as small multiples |

### `render_sankey`

Render an interactive sankey (flow) diagram: ribbons between stages whose width is proportional to the flow value. Use for source-to-destination data — where a budget goes, how users move through a product, traffic sources to outcomes. Hovering a node or ribbon highlights its connected flows.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `links` | `Array<{ source, target, value }>` | yes | Directed flows between nodes, referenced by name. The graph must be acyclic |
| `links[].source` | `string` | yes | Name of the node the flow leaves |
| `links[].target` | `string` | yes | Name of the node the flow enters |
| `links[].value` | `number` | yes | Non-negative flow magnitude; controls the ribbon width |
| `nodes` | `Array<{ name, color? }>` | no | Explicit node list controlling order and colors; nodes missing from it are derived from the links |
| `nodes[].name` | `string` | yes | Unique node name |
| `nodes[].color` | `string` | no | Color override for the node and its outgoing ribbons |
| `valueLabel` | `string` | no | Label for the flow value in the tooltip and header KPI, e.g. `"users"` |

The header shows the total inflow (the sum of flows leaving root nodes). Self-loops and cyclic link chains are rejected with an inline error rather than rendered.

### `render_dashboard`

Render a multi-widget dashboard: a grid of tiles where each tile is one of the other Sigil widgets, rendered from its own payload. Use to show several related views at once — e.g. a KPI row above a couple of charts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Dashboard title |
| `columns` | `number` | no | Maximum grid column count (1–4); defaults to `2`. The grid drops columns as the dashboard narrows (a tile never gets narrower than 300 px) |
| `tiles` | `Array<Tile \| Section>` | yes | Ordered entries, laid out left-to-right, top-to-bottom |
| `tiles[].type` | `"bar-chart" \| "line-chart" \| "pie-chart" \| "table" \| "scatter-chart" \| "treemap" \| "heatmap" \| "stat-panel" \| "sankey" \| "map" \| "funnel" \| "info-card" \| "distribution" \| "timeline"` | tile | Which widget to render |
| `tiles[].payload` | `object` | tile | That widget's own payload — the same object its `render_<type>` tool accepts |
| `tiles[].colSpan` | `number` | no | How many columns the tile spans (1..`columns`); defaults to `1`, and shrinks with the grid |
| `tiles[].note`, `.source`, `.asOf` | `string` | no | A footnote, data source and as-of time printed under the tile |
| `tiles[].section` | `string` | section | Section heading; the entry is then `{ section, description?, tiles }` and groups its tiles under the heading. One level only |
| `note`, `source`, `asOf` | `string` | no | Dashboard-level footnote, data source and as-of time, printed at the bottom |

The `tiles` description also carries four layout templates the model can follow — service health (RED: rate, errors, duration), resources (USE: utilisation, saturation, errors), SaaS KPIs, and product analytics (KPI → trend → funnel → retention). They are advice in text, not code: the model drops the tiles it has no data for.

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
| `scale` | `"sequential" \| "diverging"` | no | Choropleth colour scale, as for `render_heatmap`. Defaults to `"sequential"` |
| `midpoint` | `number` | no | Diverging only: the neutral value (default `0`) |

Geometry is the bundled [world-atlas](https://github.com/topojson/world-atlas) / [us-atlas](https://github.com/topojson/us-atlas) TopoJSON, projected with `d3-geo` (Natural Earth for the world, Albers USA for states). Choropleth uses the heatmap colour scale; bubbles are area-proportional with a size legend. Both adapt to dark/light themes. Regions with no matching datum stay a neutral land colour; unmatched ids (or points that fall off the map) are reported below it.

---

### `render_funnel`

Render a conversion funnel: ordered stages as left-aligned bars sized by how many reached each one. Every stage shows its conversion from the first stage and from the previous one, and the largest drop between two stages is called out in words as well as colour.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `steps` | `Array<{ label, value, conversionTime? }>` | yes | Stages first to last, 1–20 |
| `steps[].label` | `string` | yes | Stage name |
| `steps[].value` | `number` | yes | Non-negative count that reached the stage |
| `steps[].conversionTime` | `string` | no | Typical time from the previous stage, as display text (`"2.4 days"`) |
| `orientation` | `"horizontal" \| "vertical"` | no | Default `"horizontal"` (one row per stage); `"vertical"` puts stages left to right |
| `showDropOff` | `boolean` | no | Default `true`: loss between stages and the largest-drop callout |
| `valueLabel` | `string` | no | What the values count, e.g. `"users"` |
| `followUps` | `string[]` | no | Drill-down menu items — see **Drill-down** above |

The header KPI is overall conversion, first stage to last. A stage of 0 prints `0%` and the stages after it a dash, never `NaN`; a stage larger than the one before it is drawn at its real size and marked "grew" rather than capped.

### `render_info_card`

Render one value in context. `variant` picks what the value is held against; every graphic is backed by text, so the target, status and any off-scale flag read the same without the picture.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Card title |
| `variant` | `"bullet" \| "gauge" \| "progress" \| "ranking" \| "comparison" \| "narrative"` | yes | The form, see below |
| `items` | `Array<Item>` | all but `narrative` | 1–20 values |
| `items[].label` | `string` | yes | Metric or entry name |
| `items[].value` | `number` | yes | The actual value |
| `items[].unit` | `string` | no | Display unit; `%` and `×` hug the number |
| `items[].target` | `number` | no | bullet / progress / gauge: the goal |
| `items[].min`, `items[].max` | `number` | no | Scale ends. Unset, the scale starts at 0 and ends at a round number above every mark, so nothing is off-scale; a `%` that fits uses 0–100 |
| `items[].bands` | `number[]` | no | bullet: up to 4 qualitative range boundaries, drawn as grey shades (worst darkest) |
| `items[].thresholds` | `{ warn, critical }` | no | gauge (also bullet / progress): status zones |
| `items[].higherIsBetter` | `boolean` | no | Default `true`; flips thresholds, target status and comparison colours |
| `items[].rankDelta` | `integer` | no | ranking: places moved, `+` up (▲), `−` down (▼), `0` unchanged (–) |
| `items[].baseline` | `number` | comparison (required) | The value compared against |
| `items[].caption` | `string` | no | Small text under the item |
| `text` | `string` | narrative (required) | Plain text; a blank line separates paragraphs |
| `currentLabel`, `baselineLabel` | `string` | no | comparison: period names; default `"Current"` / `"Previous"` |

- **bullet** — a thin bar on qualitative bands with a target tick; the foot reads "93.3% of target 9 $M · Below target".
- **gauge** — a half-dial whose arc takes the status colour, with the ok / warning / critical zones as an outer ring. With `higherIsBetter` (default) a value at or below `warn` is Warning and at or below `critical` is Critical; with `false`, at or above them. The status is printed under the dial.
- **progress** — a bar that ends at `target` (unless `max` is set), coloured by status.
- **ranking** — the value-legend rows used beside the charts, read-only: rank, name, value, a meter scaled to the top entry, and a ▲▼ move when `rankDelta` is given. Pass entries already in rank order.
- **comparison** — one card per item: value, change against the baseline in % and absolute (percentage points for a `%` unit), green when better and red when worse per `higherIsBetter`, with the arrow and sign as well as colour.
- **narrative** — a few sentences, optionally under a row of key figures taken from `items`.

A value outside an explicit `min`/`max` is drawn at the edge with an arrowhead pointing past it and "above scale (max …)" / "below scale (min …)" in the foot; it never runs off the track.

### `render_distribution`

Render how one measure is distributed: a histogram of bucket counts, or box plots that compare spread across groups.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `variant` | `"histogram" \| "box"` | no | Default `"histogram"` |
| `groups` | `Array<Group>` | yes | 1–12 groups |
| `groups[].name` | `string` | yes | Group name |
| `groups[].values` | `number[]` | one of | Raw observations; the widget computes buckets or quartiles |
| `groups[].summary` | `{ min, q1, median, q3, max, mean?, count?, outliers? }` | one of (box) | Pre-computed five-number summary |
| `groups[].bins` | `Array<{ start, end, count }>` | one of (histogram) | Pre-computed buckets, ascending, not overlapping |
| `binCount` | `number` | no | Histogram from raw values: bucket count; default chosen from the data (Freedman–Diaconis, 5–40) |
| `valueLabel` | `string` | no | What the values measure, with unit; labels the value axis |
| `markers` | `Array<{ value, label, tone? }>` | no | Up to 5 vertical lines: an SLO, a target, a limit |
| `followUps` | `string[]` | no | Drill-down questions for a bucket or a box |

- **Histogram** — touching bars on a numeric axis with round bucket edges. Several groups become stacked small histograms that share both axes, so heights compare directly. A dotted line marks each raw-value group's median.
- **Box** — one row per group on a shared axis: the box spans the 25th–75th percentile, a line marks the median, a diamond the mean, whiskers reach the furthest values within 1.5 × the box width, and anything beyond is drawn as a dot. A caption under the chart says so in words. Quartiles use linear interpolation (the default of R, NumPy and Excel's `QUARTILE.INC`), so pre-computed summaries from those tools match.

### `render_timeline`

Render intervals in time as bars in lanes: a Gantt-style schedule, or a state timeline.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Chart title |
| `items` | `Array<{ row, start, end?, label?, state? }>` | yes | Intervals; `row` is the lane |
| `items[].start`, `items[].end` | `string \| number` | `start` yes | ISO 8601 dates / date-times, or plain numbers — one kind throughout. Without `end` an item runs to the next item in its lane, else to `now`, else to the end of the chart |
| `items[].label` | `string` | no | Text on the bar |
| `items[].state` | `string` | no | State during the interval; same state, same colour |
| `rows` | `string[]` | no | Lane order; unlisted lanes follow in first-seen order |
| `states` | `Array<{ name, tone? }>` | no | State order and meaning; `tone` is `success`, `warning`, `danger`, `info` or `neutral`, so "down" is never green. States without a tone take categorical colours |
| `milestones` | `Array<{ at, label, row? }>` | no | Point events: a diamond in a lane, or a labelled line across the chart |
| `now` | `string \| number` | no | A "Now" line |
| `unit` | `string` | no | Numeric times: what one unit is, e.g. `"sprint"` |

Times are printed in UTC (and the chart says so when they carry a clock), so a date-only `"2026-11-03"` is the 3rd for every viewer. Ticks align to calendar boundaries — hours, days, weeks starting Monday, months, quarters, years. Without `state`, every bar takes one accent colour, because the lane label already says what the bar is.

## Development

```bash
npm install
npm run dev                 # HTTP server on :3001 (for Claude Web via cloudflared)
npm run dev:stdio           # stdio server (for Claude Desktop / VS Code)
npm run dev:sandbox         # in-browser widget sandbox — pick any widget + preset, toggle theme / viewport / debug overlay
npm run typecheck           # tsc --noEmit
npm test                    # vitest: payloads, registry, registration, theme, e2e
npm run build               # bundle 15 widgets + compile server
npm start                   # run compiled HTTP server
npm run start:stdio         # run compiled stdio server
```

### Branch & release workflow

- **`dev`** is the default branch — feature branches and all PRs (including dependabot) target it.
- **`main`** is release-only. It moves exclusively via a `dev` → `main` pull request with the `verify` check green, merged with a **merge commit** (enforced by a branch ruleset; direct pushes, force-pushes, and deletion are blocked).
- **Release:** bump `version` in `package.json` on `dev`, merge the `dev` → `main` PR, then tag the merge commit:

  ```bash
  git tag vX.Y.Z && git push origin vX.Y.Z
  ```

  The tag triggers [`release.yml`](./.github/workflows/release.yml): it verifies the tag matches `package.json` and points at a commit reachable from `main`, re-runs the checks, publishes `@real-case/sigil` to npm via [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC — no long-lived token), and creates a GitHub Release.
- **Hotfix:** branch off `main` → PR to `main` → tag → back-merge via a `main` → `dev` PR.
- Existing clones after the default-branch switch: `git fetch origin && git remote set-head origin -a`.

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
│   ├── heatmap.ts
│   ├── stat-panel.ts
│   ├── sankey.ts
│   ├── dashboard.ts
│   ├── map.ts
│   ├── funnel.ts
│   └── info-card.ts
├── resources/            # ui:// resource serving for bundled widget HTMLs
├── registry.ts           # single source of truth — server tools, resources, build
├── shared/payloads.ts    # contract types between server and widgets
├── __tests__/            # vitest suites: registry, payloads, registration, theme, e2e
└── widgets/              # React + Recharts widget entries
    ├── shared/           # theme tokens, export utils, Toolbar, mountWidget shell
    ├── bar-chart/
    ├── line-chart/
    ├── pie-chart/
    ├── table/
    ├── scatter-chart/
    ├── treemap/
    ├── heatmap/          # hand-rolled SVG (no Recharts)
    ├── stat-panel/       # KPI / scorecard cards
    ├── sankey/           # flow ribbons between stages (Recharts Sankey)
    ├── dashboard/        # grid of tiles composing the other widgets
    ├── map/              # d3-geo + TopoJSON choropleth / bubbles (no Recharts)
    ├── funnel/           # conversion funnel, hand-rolled SVG (no Recharts)
    ├── info-card/        # bullet / gauge / progress / ranking / comparison / narrative cards
    ├── distribution/     # histogram / box plot, hand-rolled SVG
    └── timeline/         # Gantt and state timeline lanes, hand-rolled SVG
```

Each widget bundles to a standalone single-file HTML via Vite + `vite-plugin-singlefile`, then gets served as a `ui://sigil/<widget>` resource by the MCP server. The host renders it in a sandboxed iframe and communicates with it via `postMessage` per the MCP Apps spec.

---

## License

MIT — see [LICENSE](./LICENSE).
