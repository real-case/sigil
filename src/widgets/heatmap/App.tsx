import { HeatmapView } from "./HeatmapView.js";
import type { HeatmapPayload, HeatmapCell } from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

function isHeatmapCell(value: unknown): value is HeatmapCell {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["x"] === "number" &&
    Number.isInteger(v["x"]) &&
    (v["x"] as number) >= 0 &&
    typeof v["y"] === "number" &&
    Number.isInteger(v["y"]) &&
    (v["y"] as number) >= 0 &&
    typeof v["value"] === "number"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function isHeatmapPayload(value: unknown): value is HeatmapPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    isStringArray(v["xLabels"]) &&
    isStringArray(v["yLabels"]) &&
    Array.isArray(v["cells"]) &&
    v["cells"].every(isHeatmapCell)
  );
}

mountWidget({
  name: "sigil-heatmap",
  isPayload: isHeatmapPayload,
  View: HeatmapView,
  loadingVariant: "heatmap",
});
