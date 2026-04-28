# Testing mcpcharts in Claude

End-to-end test plan covering tasks #6, #18, #20 from [SPEC.md](./SPEC.md).
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
dist/widgets/table/index.html
```

If anything is missing, stop and fix the build first.

---

## Path A — Claude Desktop (stdio)

### A1. Wire the local build into Claude Desktop

Edit (macOS) `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcpcharts": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcpcharts/dist/server/stdio.js"]
    }
  }
}
```

> Use the absolute path while you're iterating locally. Once published to npm, switch to `"command": "npx", "args": ["-y", "mcpcharts"]`.

Quit Claude Desktop completely (Cmd+Q) and reopen it.

### A2. Verify the server is connected

In a new chat, ask:

> What MCP tools do you have available?

You should see **`render_bar_chart`**, **`render_line_chart`**, **`render_pie_chart`**, **`render_table`** in the list. If not — see [Debugging](#debugging) below.

### A3. Smoke test each widget with explicit prompts

These force tool selection so you isolate **rendering** from **selection**.

```
1. Use render_bar_chart to show: React 45, Vue 30, Angular 25, Svelte 18.
2. Use render_line_chart to show monthly revenue:
   US: Jan 120, Feb 140, Mar 135.
   EU: Jan 90, Feb 110, Mar 125.
3. Use render_pie_chart to show traffic sources:
   Organic 45, Direct 25, Paid 20, Social 10.
4. Use render_table to show columns [region, revenue] with rows
   US/1200, EU/950, APAC/670.
```

**Pass criteria for each:**
- iframe renders inline, no white box / error text
- Hover over a bar/line/slice/cell shows a themed tooltip
- Click a bar/slice dims the others (highlight); legend click highlights series in line chart
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
3. Name: `mcpcharts (dev)`
4. URL: `<the-cloudflared-url>/mcp` (note the `/mcp` suffix)
5. Save

You should see `mcpcharts` listed and Claude should detect 4 tools.

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

You should see a JSON response with `serverInfo: { name: "mcpcharts", version: "0.1.0" }`. If not, the issue is in the build output. Re-run `npm run build` and check the shebang on `dist/server/stdio.js`.

Claude Desktop logs:
- macOS: `~/Library/Logs/Claude/mcp*.log`

### Widget renders blank / "Connection error"

The widget's `useApp` hook expects an MCP Apps host on the parent `window`. "Connection error: MCP error -32601" in standalone view is **expected** — that's the safety net we built in. If you see it inside Claude, the host failed to send the initialize handshake.

### "Waiting for chart data…" forever

The host loaded the iframe but never sent `tool-result`. Check:
1. Did Claude actually call the tool? (Look at the tool-call indicator in the message)
2. Server logs (`npm run dev` terminal) — did the request hit the server?

### Bar chart looks unthemed (default Recharts blue)

The `installThemeStyles()` call didn't fire, or React mounted before document was ready. Open DevTools → Elements → `<head>` → check for `<style id="mcpcharts-theme-tokens">`. If missing, that's a load-order bug.

### Wrong tool gets selected

Iterate `src/tools/<tool>.ts` description — see [§A4 guidance](#a4-validate-tool-selection-the-10-risk).

---

## Sign-off checklist

Before tagging v0.1.0:

- [ ] All 4 tools render in Desktop (Path A3)
- [ ] All 4 tools render in Web (Path B3)
- [ ] Tool selection works on at least 5 of 6 natural prompts (Path A4)
- [ ] Dark/light theme switching works in both hosts
- [ ] Copy CSV → text in clipboard, parses cleanly when pasted into a spreadsheet
- [ ] Copy PNG → image in clipboard or downloaded file
- [ ] No console errors in DevTools across all 4 widgets
- [ ] `npm run typecheck` clean
- [ ] `npm run build` clean
