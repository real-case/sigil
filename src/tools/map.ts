import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { MapPayload } from "../shared/payloads.js";

export const MAP_UI_URI = "ui://sigil/map";

const description = [
  "Render an interactive choropleth map: regions shaded by a numeric value.",
  "Set scope to 'world' for a country map (default) or 'us-states' for a United States state map.",
  "Use for country- or state-level metrics — population, GDP, sales or users by region, counts, any per-region intensity you want to see geographically.",
  "World: identify each country by ISO 3166-1 alpha-3 (preferred, e.g. 'USA', 'DEU', 'JPN'), alpha-2, numeric, or common English name.",
  "US states: identify each state by 2-letter USPS code (preferred, e.g. 'CA', 'TX', 'NY'), full name, or FIPS number.",
  "For non-geographic categorical comparison use render_bar_chart; for a category × category matrix use render_heatmap.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Chart title shown above the map."),
  scope: z
    .enum(["world", "us-states"])
    .optional()
    .describe(
      "Base map: 'world' (country choropleth) or 'us-states' (US state choropleth). Defaults to 'world'.",
    ),
  variant: z
    .enum(["choropleth"])
    .optional()
    .describe("Encoding. Currently 'choropleth' (regions shaded by value). Defaults to 'choropleth'."),
  data: z
    .array(
      z.object({
        id: z
          .string()
          .min(1)
          .describe(
            "Region identifier. World: ISO 3166-1 alpha-3 (preferred, e.g. 'USA'), alpha-2, numeric, or common English name. US states: USPS code (preferred, e.g. 'CA'), full name, or FIPS.",
          ),
        value: z.number().describe("Numeric value shading this country."),
        label: z
          .string()
          .optional()
          .describe("Optional display-name override for the tooltip."),
      }),
    )
    .min(1)
    .describe("One entry per country. Provide at least one."),
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
        data: args.data,
        valueLabel: args.valueLabel,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
