# Testing Sigil in Claude

End-to-end manual test plan for the MCP Apps pipeline (build → serve → render in a live host). It complements the automated vitest suites (`npm test`).
Run **Path A** first (stdio, free, fast). Once green, run **Path B** (HTTP) to validate the Custom Connector flow.

---

## Prerequisites

```bash
# from the repo root
npm install
npm run build
npm run typecheck    # should be clean
```

After `npm run build` you should see:

```
dist/server/stdio.js          # has shebang + executable bit
dist/widgets/bar-chart/index.html
dist/widgets/line-chart/index.html
dist/widgets/pie-chart/index.html
dist/widgets/scatter-chart/index.html
dist/widgets/table/index.html
dist/widgets/treemap/index.html
dist/widgets/heatmap/index.html
dist/widgets/stat-panel/index.html
dist/widgets/sankey/index.html
dist/widgets/dashboard/index.html
dist/widgets/map/index.html
```

If anything is missing, stop and fix the build first.

---

## Path A — Claude Desktop (stdio)

### A1. Wire the local build into Claude Desktop

Edit (macOS) `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sigil": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/sigil/dist/server/stdio.js"]
    }
  }
}
```

> Use the absolute path while you're iterating locally. Once published to npm, switch to `"command": "npx", "args": ["-y", "@real-case/sigil"]`.

Quit Claude Desktop completely (Cmd+Q) and reopen it.

### A2. Verify the server is connected

In a new chat, ask:

> What MCP tools do you have available?

You should see **`render_bar_chart`**, **`render_line_chart`**, **`render_pie_chart`**, **`render_scatter_chart`**, **`render_treemap`**, **`render_heatmap`**, **`render_table`**, **`render_stat_panel`**, **`render_sankey`**, **`render_dashboard`**, and **`render_map`** in the list. If not — see [Debugging](#debugging) below.

### A3. Smoke test each widget with explicit prompts

These force tool selection so you isolate **rendering** from **selection**.

```
1. Use render_bar_chart to show: React 45, Vue 30, Angular 25, Svelte 18.
2. Use render_line_chart to show monthly revenue:
   US: Jan 120, Feb 140, Mar 135.
   EU: Jan 90, Feb 110, Mar 125.
3. Use render_pie_chart to show traffic sources:
   Organic 45, Direct 25, Paid 20, Social 10.
4. Use render_table to show columns [region, revenue, trend] with rows
   US/1200, EU/950, APAC/670, where trend is a sparkline column
   holding ~6 weekly values per row.
5. Use render_scatter_chart to show height vs weight:
   (170, 65), (180, 80), (165, 58), (175, 72).
6. Use render_treemap to show disk usage:
   node_modules 4200, src 310, dist 780, assets 120.
7. Use render_heatmap to show commits by weekday and hour
   (any small weekday × hour grid).
8. Use render_stat_panel to show KPIs:
   MRR $42k up 8%, churn 2.1% down 0.3pp, NPS 54.
9. Use render_sankey to show a checkout funnel:
   Product page → Cart 4200, Product page → Left 9800,
   Cart → Checkout 2600, Cart → Abandoned 1600,
   Checkout → Purchase 1900, Checkout → Failed 700.
10. Use render_dashboard with a bar tile of quarterly sales
    and a stat-panel tile of the same totals.
11. Use render_map to color a world map by population:
    China, India, USA, Indonesia, Pakistan.
```

**Pass criteria for each:**
- iframe renders inline, no white box / error text
- Hover over a bar/line/slice/cell shows a themed tooltip
- Click a bar/slice dims the others (highlight); legend hover focuses a series in the line chart, legend click mutes it
- Dark mode follows your OS setting (try toggling Appearance in System Settings — chart should re-theme)
- **Copy CSV** and **Copy PNG** buttons exist; click → button shows "Copied ✓" briefly
- Paste in a notes app: CSV appears as text, PNG appears as an image

If clipboard write fails silently — check the iframe sandbox permissions in DevTools. PNG falls back to download instead.

### A4. Validate tool selection (the §10 risk)

Now test **without** naming the tool. Each prompt should pick the listed tool:

| Prompt | Expected |
|--------|----------|
| "Compare quarterly sales: Q1 240, Q2 310, Q3 295, Q4 380" | `render_bar_chart` |
| "Plot temperature over the last 12 months for Berlin and Madrid" | `render_line_chart` |
| "Show me how my budget breaks down: rent 40%, food 25%, transport 15%, fun 20%" | `render_pie_chart` |
| "Tabulate this so I can sort by revenue: US/1200, EU/950, APAC/670" | `render_table` |
| "Visualize the top 10 frameworks by GitHub stars" | `render_bar_chart` (ranking) |
| "Show CO₂ levels measured every hour today" | `render_line_chart` (time series) |

**If Claude picks the wrong tool**, that's a description-tuning problem in `src/tools/<name>.ts`. The fix is to:
- sharpen the **Use when …** clause (give concrete example domains)
- strengthen the **anti-hint** ("For X, use render_other instead.")
- shorten the description — selection accuracy often improves with fewer words

Re-run `npm run build:server` and restart Claude Desktop after each change.

### A5. Design-system visual QA

After §A3 confirms widgets render at all, walk through this checklist to verify the v0.3.0 design system (tokens + primitives) is intact across every widget. Run it once in **light** and once in **dark** — switch your OS appearance preference between passes. Each widget gets ~30 seconds.

**Per-widget checks (× 11):**

| Widget | Look for |
|---|---|
| `bar-chart` | Category labels in IBM Plex Sans (weight 500; smaller when > 12 bars); numeric ticks in mono `tabular-nums` — that axis shows only when a negative value switches pill mode off. Axis caption (`xlabel · ylabel`) in mono uppercase, letter-spaced. Hovering one bar dims the rest to 32 % (click-muted bars sit at 18 %); horizontal pill bars ride a static `surface-sunken` lane track. Frosted-glass tooltip with `surface-elevated` bg + mid shadow. |
| `line-chart` | Lines 2.4 px uniform, round joins. Every series carries a gradient area fill fading to the baseline while the chart has ≤ 3 series (18 % top stop, both themes); 4+ series drop the fills. Start/end cap dots on each series — end r 4 / ring 2, start r 3 / ring 1.5, rings `surface`-colored; series under ~12 points also mark every mid point at the start-cap size. Active dot has a `surface`-colored ring (looks "punched out" against the line). Hover tooltip lists all series with `tabular-nums` values. |
| `scatter-chart` | Dots at 70 % opacity. Tooltip hides the label (only series rows visible). Legend is the shared ValueLegend in row layout — 14 px rounded-square swatches and a min/avg/max range track; the only circle is the 7 px avg marker on the track. |
| `pie-chart` | Slice labels show percent only when ≥ 4 %. Stroke between slices = `surfaces.bg` (looks like a thin gap, not a border). Donut variant has 54 % inner radius. Tooltip formats as `<value> (<pct>%)`. Over-cap slices (beyond `maxSegments`, default 5) collapse into a muted "Other" — click it (or its legend row) to expand, "Show top N" collapses back; Copy CSV still exports every original row. |
| `treemap` | Leaves have rounded `radius.sm` corners and 3 px gaps. Two-line labels (name + tabular value) appear when the leaf is ≥ 60 × 30 px; between 40 × 20 and 60 × 30 px only the name shows. White text has a subtle drop shadow. |
| `heatmap` | **Single-hue ramp** — cells go from barely-visible `series-0` tint to full intensity. No multi-colored cells. Cells have 2 px gaps and rounded corners. |
| `table` | Header row in mono uppercase axis-cap font. Numeric cells use mono with `tabular-nums`. Row hover gets `surface-sunken` background. Filter input gets a 2 px focus ring when tabbed into. Sparkline columns render a 56 × 16 `series-0` spark plus a mono last-value readout, centered by default; header click sorts by last value; filter terms never match digits inside sparks; row hover must NOT re-emphasize the spark; Copy CSV exports one joined quoted cell per series. |
| `stat-panel` | KPI cards: mono `tabular-nums` values, trend deltas coloured from `semantic` tokens, sparkline / progress / badge variants render. Inside a dashboard tile, cards flatten to sunken wells (no elevation). |
| `sankey` | Node rects colored from the series palette (payload `color` overrides win); ribbons inherit their source node's color at 30 % opacity. Node labels sit right of the rect — sink nodes label to the left; a mono `tabular-nums` value line appears when the node is ≥ 26 px tall. Hovering a node or ribbon raises connected ribbons to 55 % and dims the rest; the header KPI shows total inflow. A cyclic payload shows the error EmptyState, not a crash. |
| `dashboard` | Tiles form a fixed-column grid (payload `columns`, clamped 1–4, default 2; column widths are fluid) honouring `colSpan`. Every tile keeps its own title/toolbar. Embedded widgets recede — no double surfaces or nested shadows. |
| `map` | Choropleth uses the single-hue intensity ramp + legend; no-data land stays a neutral tint. Bubbles scale by √value (area-proportional above a 3 px floor) with a size legend. The footnote reports the *count* of unmatched regions / off-map points (ids are not listed). |

**Cross-cutting checks:**

- [ ] Toolbar buttons get a focus ring (Tab into them and observe) — confirms `--sigil-focus-ring` is wired.
- [ ] On a slow network, the loading skeleton appears (shimmer rectangles) instead of "Connecting…" text. Easy to test: throttle in DevTools, then trigger a tool.
- [ ] Triggering an error (e.g. break the JSON payload) shows the new `EmptyState variant="error"` card — accent in `danger.text`, icon-shaped glyph slot.
- [ ] Switch OS between light and dark while a widget is open — series colors *should* visibly change (palette is split per theme, not shared). Tooltips re-tint without flicker.
- [ ] Press Tab repeatedly inside any widget — focus rings appear on toolbar buttons and the table filter. Cells in Recharts SVGs don't ring (intentional — see `.recharts-wrapper :focus:not(:focus-visible)` in styles.css).
- [ ] OS-level "Reduce motion" preference disables shimmer + tooltip fade (test via macOS System Settings → Accessibility → Display → Reduce motion).

**If any check fails:**

- Wrong font → IBM Plex is self-hosted via `@fontsource` and inlined into each bundle (see the `@import`s in `src/widgets/shared/styles.css`); check the compiled bundle embeds it (`grep -c "IBM Plex" dist/widgets/bar-chart/index.html` should be > 0). No network access is needed.
- Wrong color/series → verify `oklch(…)` is parsing in your browser (Chrome ≥ 111, Safari ≥ 15.4, Firefox ≥ 113). If you see fallback grey, OKLCH support is missing.
- No frosted tooltip → `backdrop-filter` may be sandboxed in this host. The `color-mix` fallback should still render a tinted surface; the blur just disappears.
- Token vars look unset (`var(--sigil-foo)` showing literal text) → token-surface test should catch this; run `npm test` to find a missing emitter.

---

## Path B — Claude Web (HTTP via Custom Connector)

Requires a Claude.ai **paid** plan (Custom Connectors gate).

### B1. Tunnel localhost

```bash
# terminal 1
npm run dev    # listens on http://127.0.0.1:3001/mcp

# terminal 2
brew install cloudflared    # if needed
npx cloudflared tunnel --url http://localhost:3001
```

Cloudflared prints an HTTPS URL like `https://crisp-falcon-7821.trycloudflare.com`. Copy it.

### B2. Add the connector

1. Open Claude.ai → click your avatar → **Settings** → **Connectors**
2. **Add custom connector**
3. Name: `sigil (dev)`
4. URL: `<the-cloudflared-url>/mcp` (note the `/mcp` suffix)
5. Save

You should see `sigil` listed and Claude should detect 10 tools.

### B3. Repeat A3 + A4 in a Web chat

The widget sandbox in Web is slightly stricter than Desktop. Specifically watch for:
- **CSP errors** in the browser DevTools console — if anything fails to load, our bundle violated a content security policy
- **Iframe size** — the chart should fill its container; if it collapses to 0px, our `ResponsiveContainer` is being given 0 height by the host
- **Clipboard permissions** — Web iframes are stricter about `clipboard-write`. If Copy PNG fails, it should fall back to a download.

---

## Debugging

### Server doesn't appear in Claude Desktop's tool list

```bash
# verify stdio works in isolation
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  | node dist/server/stdio.js
```

You should see a JSON response whose `serverInfo` reports `name: "sigil"` and the version from `package.json` (the server derives it at runtime — a `0.0.0` here means the manifest wasn't found). If not, the issue is in the build output. Re-run `npm run build` and check the shebang on `dist/server/stdio.js`.

Claude Desktop logs:
- macOS: `~/Library/Logs/Claude/mcp*.log`

### Widget renders blank / "Connection error"

The widget's `useApp` hook expects an MCP Apps host on the parent `window`. "Connection error: MCP error -32601" in standalone view is **expected** — that's the safety net we built in. If you see it inside Claude, the host failed to send the initialize handshake.

### "Waiting for chart data…" forever

The host loaded the iframe but never sent `tool-result`. Check:
1. Did Claude actually call the tool? (Look at the tool-call indicator in the message)
2. Server logs (`npm run dev` terminal) — did the request hit the server?

### Bar chart looks unthemed (default Recharts blue)

The `installThemeStyles()` call didn't fire, or React mounted before document was ready. Open DevTools → Elements → `<head>` → check for `<style id="sigil-theme-tokens">`. If missing, that's a load-order bug.

### Wrong tool gets selected

Iterate `src/tools/<tool>.ts` description — see [§A4 guidance](#a4-validate-tool-selection-the-10-risk).

---

## Sign-off checklist

Before tagging a release (current target: v0.2.0):

- [ ] All 10 tools render in Desktop (Path A3)
- [ ] All 10 tools render in Web (Path B3)
- [ ] Tool selection works on at least 5 of 6 natural prompts (Path A4)
- [ ] Dark/light theme switching works in both hosts
- [ ] Copy CSV → text in clipboard, parses cleanly when pasted into a spreadsheet
- [ ] Copy PNG → image in clipboard or downloaded file
- [ ] No console errors in DevTools across all 11 widgets
- [ ] `npm run typecheck` clean
- [ ] `npm run build` clean
