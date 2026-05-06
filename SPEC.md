# Sigil — Technical Specification

## 1. Project Overview

### 1.1 What it is
An MCP Apps server with interactive chart widgets that render inline inside AI hosts (Claude, ChatGPT, VS Code Copilot, Microsoft Copilot, Goose). The user wires the server up once — and from then on the AI assistant visualises data with interactive charts instead of text tables.

### 1.2 Key differentiator
All existing MCP chart servers (`@antv/mcp-server-chart`, `@ax-crew/chartjs-mcp-server`, `mcp-echarts`) emit **static PNG images or HTML snippets**. Sigil is the first server built on the **MCP Apps** extension that renders **live, interactive widgets** inside a sandboxed iframe with hover, zoom, click, and export.

### 1.3 Target audience
Users of Claude, ChatGPT, and VS Code Copilot who work with numeric data: analysts, managers, developers, researchers.

### 1.4 Project goals
- Claim the `sigil` name on npm with a working package (v0.1.0)
- Validate the MCP Apps pipeline end-to-end, from server to render in Claude
- Produce content for the personal brand (article, demo video)
- Reach 100+ GitHub stars in the first month

---

## 2. Tech stack

| Layer | Technology | Rationale |
|------|------------|-----------|
| **MCP Server** | `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps` | Official SDK for MCP Apps |
| **Server Transport** | Express + `StreamableHTTPServerTransport` | HTTP for remote mode |
| **Stdio Transport** | `StdioServerTransport` | For local launch via `npx` |
| **Chart Library** | Recharts | Declarative React API, tooltips/responsive/animations out of the box, bundles well into a single file. If bundle size becomes an issue, migration to Chart.js or uPlot is straightforward (each widget is isolated). |
| **UI Framework** | React 18+ | Required by Recharts |
| **Bundler** | Vite + `vite-plugin-singlefile` | Bundles each widget into a single HTML file |
| **Language** | TypeScript | Strict typing for tool schemas and data |
| **Dev Tunneling** | cloudflared | Exposes localhost so Claude web can reach it |

### 2.1 Key npm dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "@modelcontextprotocol/ext-apps": "latest",
    "express": "^4.x",
    "recharts": "^2.x",
    "react": "^18.x",
    "react-dom": "^18.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "vite-plugin-singlefile": "latest",
    "@types/react": "^18.x",
    "typescript": "^5.x"
  }
}
```

---

## 3. Architecture

### 3.1 How MCP Apps works

```
User → writes a prompt → AI host (Claude)
  → sees the available tools with their descriptions
  → decides to call render_bar_chart
  → sends the tool call with parameters to the MCP server
  → server returns data + the host renders the linked HTML widget
  → user sees an interactive chart in an iframe inside the chat
```

### 3.2 MCP Apps mechanics

1. The tool declares `_meta.ui.resourceUri` → points to a `ui://` resource
2. The host can preload the UI before the tool is even called
3. The HTML resource is rendered in a sandboxed iframe (no access to parent DOM, cookies, or localStorage)
4. Two-way communication runs over JSON-RPC on top of postMessage
5. The widget receives data through `app.ontoolresult`
6. The widget can call other tools via `app.callServerTool()`

### 3.3 Two distribution modes

**Stdio (local)** — the user adds the server to their Claude Desktop / VS Code config:
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
No hosting required — the npm package is fetched and run locally.

**HTTP (remote)** — for Claude web (Custom Connectors). The server is reachable over an HTTPS URL. Hosting is needed (Railway, Cloudflare Workers, or a cloudflared tunnel during development).

### 3.4 Project structure

```
Sigil/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── server.ts                 # MCP server entry point (HTTP)
│   ├── stdio.ts                  # MCP server entry point (stdio)
│   ├── tools/                    # Tool definitions + input schemas
│   │   ├── bar-chart.ts
│   │   ├── line-chart.ts
│   │   ├── pie-chart.ts
│   │   └── table.ts
│   └── widgets/                  # React widget entry points
│       ├── shared/
│       │   ├── theme.ts          # Design tokens, dark/light
│       │   └── export-utils.ts   # Copy CSV/PNG helpers
│       ├── bar-chart/
│       │   ├── index.html
│       │   └── App.tsx
│       ├── line-chart/
│       │   ├── index.html
│       │   └── App.tsx
│       ├── pie-chart/
│       │   ├── index.html
│       │   └── App.tsx
│       └── table/
│           ├── index.html
│           └── App.tsx
├── dist/                         # Bundled single-file HTMLs (build output)
├── README.md
└── LICENSE                       # MIT
```

---

## 4. MVP: 4 tools

### 4.1 render_bar_chart

**Input Schema:**
```typescript
{
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  orientation?: "vertical" | "horizontal"; // default: "vertical"
  xlabel?: string;
  ylabel?: string;
}
```

**Tool Description (critical for tool selection):**
```
Render an interactive bar chart. Use when comparing discrete categories,
showing rankings, or displaying distribution across groups. Supports
horizontal and vertical orientations with hover tooltips.
```

### 4.2 render_line_chart

**Input Schema:**
```typescript
{
  title: string;
  series: Array<{
    name: string;
    data: Array<{ x: string | number; y: number }>;
  }>;
  xlabel?: string;
  ylabel?: string;
}
```

**Tool Description:**
```
Render an interactive line chart with one or more series. Use for
time-series data, trends, progress tracking, or any continuous data.
Supports multiple series overlay and hover crosshair.
```

### 4.3 render_pie_chart

**Input Schema:**
```typescript
{
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  variant?: "pie" | "donut"; // default: "donut"
}
```

**Tool Description:**
```
Render an interactive pie or donut chart. Use for showing proportions,
market share, budget breakdown, or composition of a whole.
Hover to see exact percentages.
```

### 4.4 render_table

**Input Schema:**
```typescript
{
  title: string;
  columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>;
  rows: Array<Record<string, string | number>>;
  sortable?: boolean; // default: true
  filterable?: boolean; // default: true
}
```

**Tool Description:**
```
Render an interactive data table with sorting and filtering.
Use when the user needs to explore, compare, or drill into
structured data. Supports column sorting and text search.
```

---

## 5. Interactivity (all widgets)

### 5.1 Required (MVP)
- Hover tooltips with exact values
- Click-to-highlight a segment/series
- Responsive layout (adapts to iframe size)
- Dark/light theme (driven by `prefers-color-scheme`)

### 5.2 Phase 2
- "Copy as CSV" button
- "Copy as PNG" button
- Animation on data load

---

## 6. Design

### 6.1 Approach
Collect chart-design screenshots from reference products (Vercel Analytics, Linear, PostHog, Stripe Dashboard), feed them to Claude, and generate a design token set.

### 6.2 Design Token Set (structure)

```typescript
interface ChartDesignTokens {
  // Series palette (10 colors; charts wrap around with `i % length`)
  seriesColors: string[];

  // Backgrounds
  background: string;
  surfaceBackground: string; // tooltip, legend

  // Text
  textPrimary: string;
  textSecondary: string;  // axis labels, legend
  textMuted: string;      // grid labels

  // Grid & Axes
  gridLine: string;
  axisLine: string;

  // Tooltip
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;

  // Shared
  borderRadius: number;
  fontFamily: string;
  fontSize: { label: number; title: number; tooltip: number };
}
```

### 6.3 Dark / Light Theme
Driven by the `prefers-color-scheme` media query. Both token sets live in `shared/theme.ts` and are applied via CSS variables.

---

## 7. Implementation plan

### Phase 1 — MVP: Bar Chart E2E (Days 1–3)

**Day 1: Project skeleton**
- [ ] `npm init`, install dependencies
- [ ] Set up Vite + `vite-plugin-singlefile` for widget bundling
- [ ] Express + MCP SDK + ext-apps: register one tool, `render_bar_chart`
- [ ] A minimal HTML widget (no React yet) — confirm the iframe renders

**Day 2: First widget**
- [ ] React + Recharts inside the bar-chart widget
- [ ] `app.ontoolresult` → parse data → render BarChart
- [ ] Hover tooltips, responsive container
- [ ] Test via `cloudflared tunnel` + Claude Custom Connector

**Day 3: Bar chart polish**
- [ ] Design tokens (dark/light theme)
- [ ] Click-to-highlight
- [ ] Horizontal/vertical orientation
- [ ] Edge cases: empty data, long labels, large datasets

### Phase 2 — Full set (Days 4–5)

**Day 4: Remaining widgets**
- [ ] `render_line_chart` — multiple series, crosshair tooltip
- [ ] `render_pie_chart` — pie/donut variant, percentage labels
- [ ] `render_table` — sortable columns, text search filter

**Day 5: Export and polish**
- [ ] Copy as CSV for every widget
- [ ] Copy as PNG (html2canvas or recharts native)
- [ ] Test every tool with varied prompts in Claude
- [ ] Iterate tool descriptions for better tool selection

### Phase 3 — Publish (Day 6)

- [ ] Stdio entry point (`src/stdio.ts`)
- [ ] `npm publish` as `sigil@0.1.0`
- [ ] README with:
  - GIF demo of each widget
  - Setup instructions for Claude Desktop / VS Code / Claude web
  - Input schema reference
- [ ] Publish to GitHub (MIT license)

### Phase 4 — Distribution and brand (Day 7+)

- [ ] List on MCPHub / Glama.ai / MCP Marketplace
- [ ] Twitter/LinkedIn post with demo video
- [ ] Dev.to / Medium article: "I Built the First Interactive Charts for Claude — Here's How"
- [ ] Collect feedback, iterate

### Phase 5 — Expansion (demand-driven)

- [ ] `render_heatmap`, `render_scatter`, `render_treemap`
- [ ] Combo charts (bar + line)
- [ ] Customisation through tool parameters (colors, fonts)
- [ ] Drill-down: tools called from inside the widget (`app.callServerTool`)
- [ ] Interactive Mermaid diagrams (if there's demand)

---

## 8. Testing

### 8.1 Dev flow
1. Run the MCP server locally: `npm run dev` → `http://localhost:3001`
2. In a second terminal: `npx cloudflared tunnel --url http://localhost:3001`
3. Copy the HTTPS URL → Claude Settings → Connectors → Add custom connector
4. In a Claude chat: "Show a bar chart with this data: React 45%, Vue 30%, Angular 25%"
5. Confirm the iframe renders, tooltips work, and the theme is correct

### 8.2 Test prompts for tool-selection validation
```
- "Show the breakdown of expenses by category"     → pie_chart
- "Compare sales across Q1–Q4"                     → bar_chart
- "Show the temperature trend over the last year"  → line_chart
- "Render a table sorted by revenue"               → table
- "Visualize this data: ..."                       → any suitable tool
```

### 8.3 Edge cases
- Empty data array → graceful empty state
- 1 data point → renders correctly
- 100+ data points → performance, scrolling
- Very long labels → truncation / rotation
- Unicode in labels
- Negative values
- Mixed types in a table

---

## 9. Hosting (for remote mode)

### 9.1 For development
`cloudflared tunnel` — free, no signup, ephemeral URL.

### 9.2 For production (pick one)

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| Railway | ~$5/mo | Simple deploy, Git integration | Paid |
| Cloudflare Workers | Free tier | Free, global edge | Workers runtime constraints |
| Render | Free tier | Free instance | Cold start on free tier |
| VPS (Hetzner) | ~€4/mo | Full control | Requires DevOps |

---

## 10. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Claude doesn't pick the tool | Medium | High | Iterate on tool descriptions, test alternative phrasings |
| Anthropic ships native charts | Low (short-term) | High | Push beyond basic charts (drill-down, combo charts) |
| Iframe constrains UX | Medium | Medium | Maximise interactivity within sandbox limits |
| Recharts bundle size too large | Medium | Medium | Profile, switch to Chart.js or uPlot if needed |
| MCP Apps spec changes | Low | Medium | Track ext-apps changelog, keep SDK current |
| Custom Connectors gated behind paid plans | Confirmed | Medium | Stdio mode via npx covers Claude Desktop / VS Code for free |

---

## 11. Open Questions

1. **Bundle size budget** — what's the max acceptable single-file HTML size? Need a Recharts bundle benchmark.
2. **Iframe dimensions** — what size do different hosts (Claude web, Desktop, VS Code) allocate? Needs testing.
3. **Remote hosting** — Railway vs Cloudflare Workers vs Render for the demo instance?
4. **Monorepo** — single `sigil` package containing all widgets (recommended for simplicity).
5. **GitHub org** — publish under the personal account or create a `sigil` org?

---

## 12. Success metrics

| Metric | Target (1 month) | Target (3 months) |
|--------|------------------|-------------------|
| GitHub stars | 100+ | 500+ |
| npm weekly downloads | 50+ | 200+ |
| Marketplaces | Listed on MCPHub / Glama.ai | Featured in curated MCP lists |
| Content | 1 article + demo video | 3+ third-party mentions |
| Tool selection rate | Claude calls the tools in 80%+ of relevant cases | — |
