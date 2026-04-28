# Sigil

**Live, interactive data widgets for Claude and other MCP Apps hosts.**

> A *sigil* is a symbol that carries compressed meaning. Same idea, applied to data: a chart you can hover, click, and copy — embedded directly in your conversation, instead of a flat PNG.

Unlike existing MCP chart servers that return static images, Sigil renders **live widgets** — hover tooltips, click-to-highlight, Copy-as-CSV / PNG — inside the host's sandboxed iframe via the [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) extension.

🌐 [sigil.live](https://sigil.live) · [TESTING.md](./TESTING.md) · [INCANTATIONS.md](./INCANTATIONS.md) · [SPEC.md](./SPEC.md)

> **Status:** v0.1.0 — MVP complete.

## Demo

> Demo GIFs coming soon — once E2E-tested in Claude.

## Tools

| Tool | When it fires | Renders |
|------|---------------|---------|
| [`render_bar_chart`](#render_bar_chart) | comparing discrete categories, rankings | vertical/horizontal bars with hover tooltips, click-to-highlight |
| [`render_line_chart`](#render_line_chart) | time-series, trends, continuous data | multi-series lines with shared crosshair tooltip |
| [`render_pie_chart`](#render_pie_chart) | part-of-whole proportions, composition | pie or donut with percentage labels |
| [`render_table`](#render_table) | structured data exploration | sortable + filterable data table |

All chart widgets expose **Copy CSV** and **Copy PNG** buttons; the table exposes **Copy CSV**.

### Optional: Ritual Mode

Sigil ships with an optional [`INCANTATIONS.md`](./INCANTATIONS.md) preset — copy it into Claude's Project Instructions and you can summon charts in ritual register:

```
Astrologers proclaim a week of Q1 sales: US 1200, EU 950, APAC 670.
View Air on monthly temperatures for Berlin and Madrid.
Animate Dead из revenue по регионам.
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
      "args": ["-y", "sigil"]
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
      "args": ["-y", "sigil"]
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

---

## Development

```bash
npm install
npm run dev                 # HTTP server on :3001 (for Claude Web via cloudflared)
npm run dev:stdio           # stdio server (for Claude Desktop / VS Code)
npm run typecheck           # tsc --noEmit
npm run build               # bundle 4 widgets + compile server
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
│   └── table.ts
├── resources/            # ui:// resource serving for bundled widget HTMLs
├── shared/payloads.ts    # contract types between server and widgets
└── widgets/              # React + Recharts widget entries
    ├── shared/           # theme tokens, export utils, Toolbar, styles
    ├── bar-chart/
    ├── line-chart/
    ├── pie-chart/
    └── table/
```

Each widget bundles to a standalone single-file HTML via Vite + `vite-plugin-singlefile`, then gets served as a `ui://sigil/<widget>` resource by the MCP server. The host renders it in a sandboxed iframe and communicates with it via `postMessage` per the MCP Apps spec.

---

## License

MIT — see [LICENSE](./LICENSE).
