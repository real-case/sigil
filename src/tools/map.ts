import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { mapSchema } from "../shared/schemas.js";
import type { MapPayload } from "../shared/payloads.js";

export const MAP_UI_URI = "ui://sigil/map";

const description = [
  "Render an interactive map. Two encodings:",
  "variant 'choropleth' (default) shades regions by a value — provide `data`;",
  "variant 'bubble' plots sized markers at coordinates — provide `points` with lat/lon.",
  "Set scope to 'world' for a country map (default) or 'us-states' for a United States map.",
  "Choropleth is for per-region intensity (population, GDP, counts by country/state); bubble is for point data (cities, offices, events by location).",
  "World regions: ISO 3166-1 alpha-3 (preferred, e.g. 'USA', 'DEU'), alpha-2, numeric, or common English name. US states: 2-letter USPS code (preferred, e.g. 'CA', 'TX'), full name, or FIPS.",
  "For non-geographic categorical comparison use render_bar_chart; for a category × category matrix use render_heatmap.",
].join(" ");

export function registerMapTool(server: McpServer) {
  registerAppTool(
    server,
    "render_map",
    {
      title: "Map",
      description,
      inputSchema: mapSchema.shape,
      _meta: { ui: { resourceUri: MAP_UI_URI } },
    },
    async (args) => {
      const payload: MapPayload = {
        title: args.title,
        scope: args.scope ?? "world",
        variant: args.variant ?? "choropleth",
        data: args.data ?? [],
        points: args.points,
        valueLabel: args.valueLabel,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
