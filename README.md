# mcpcharts

Interactive chart widgets for Claude and other MCP Apps hosts.

Unlike existing MCP chart servers that return static PNGs, `mcpcharts` renders **live, interactive widgets** (hover tooltips, click-to-highlight, responsive) inside the host's sandboxed iframe via the MCP Apps extension.

> **Status:** scaffolded — see [SPEC.md](./SPEC.md) for the full technical specification and implementation plan.

## Planned tools (MVP)

- `render_bar_chart` — vertical/horizontal bars, hover tooltips
- `render_line_chart` — multi-series, crosshair tooltip
- `render_pie_chart` — pie/donut, percentage labels
- `render_table` — sortable, filterable data table

## Install (coming soon)

```json
{
  "mcpServers": {
    "mcpcharts": {
      "command": "npx",
      "args": ["-y", "mcpcharts"]
    }
  }
}
```

## Development

```bash
npm install
npm run dev           # HTTP server on :3001
npm run build         # bundle widgets + compile server
```

## License

MIT
