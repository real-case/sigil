import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
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

const inputSchema = {
  title: z.string().min(1).describe("Chart title shown above the map."),
  scope: z
    .enum(["world", "us-states"])
    .optional()
    .describe("Base map: 'world' (countries) or 'us-states' (US states). Defaults to 'world'."),
  variant: z
    .enum(["choropleth", "bubble"])
    .optional()
    .describe(
      "Encoding: 'choropleth' (shade regions from `data`) or 'bubble' (sized markers from `points`). Defaults to 'choropleth'.",
    ),
  data: z
    .array(
      z.object({
        id: z
          .string()
          .min(1)
          .describe(
            "Region identifier. World: ISO 3166-1 alpha-3 (preferred, e.g. 'USA'), alpha-2, numeric, or common English name. US states: USPS code (preferred, e.g. 'CA'), full name, or FIPS.",
          ),
        value: z.number().describe("Numeric value shading this region."),
        label: z
          .string()
          .optional()
          .describe("Optional display-name override for the tooltip."),
      }),
    )
    .optional()
    .describe("Choropleth regions (required for variant 'choropleth'). One entry per region."),
  points: z
    .array(
      z.object({
        lat: z.number().describe("Latitude in degrees (−90..90)."),
        lon: z.number().describe("Longitude in degrees (−180..180)."),
        value: z.number().describe("Non-negative magnitude controlling the marker area."),
        label: z.string().optional().describe("Label shown in the tooltip."),
      }),
    )
    .optional()
    .describe("Bubble markers (required for variant 'bubble'). One entry per point."),
  valueLabel: z
    .string()
    .optional()
    .describe("Optional label for the value in the tooltip and legend, e.g. 'GDP per capita'."),
};

export function registerMapTool(server: McpServer) {
  registerAppTool(
    server,
    "render_map",
    {
      title: "Map",
      description,
      inputSchema,
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
