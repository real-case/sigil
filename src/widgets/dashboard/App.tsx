import { DashboardView } from "./DashboardView.js";
import type { DashboardPayload, DashboardTile } from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

const TILE_TYPES = new Set([
  "bar-chart",
  "line-chart",
  "pie-chart",
  "table",
  "scatter-chart",
  "treemap",
  "heatmap",
  "stat-panel",
]);

function isDashboardTile(value: unknown): value is DashboardTile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["type"] === "string" &&
    TILE_TYPES.has(v["type"]) &&
    typeof v["payload"] === "object" &&
    v["payload"] !== null &&
    (v["colSpan"] === undefined || typeof v["colSpan"] === "number")
  );
}

export function isDashboardPayload(value: unknown): value is DashboardPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["tiles"]) &&
    v["tiles"].length > 0 &&
    v["tiles"].every(isDashboardTile)
  );
}

mountWidget({
  name: "sigil-dashboard",
  isPayload: isDashboardPayload,
  View: DashboardView,
  loadingVariant: "generic",
});
