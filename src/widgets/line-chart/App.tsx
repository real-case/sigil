import { LineChartView } from "./LineChartView.js";
import type {
  LineChartPayload,
  LineSeries,
  LineDatum,
} from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

function isLineDatum(value: unknown): value is LineDatum {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (typeof v["x"] === "string" || typeof v["x"] === "number") &&
    typeof v["y"] === "number"
  );
}

function isLineSeries(value: unknown): value is LineSeries {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["name"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isLineDatum)
  );
}

export function isLineChartPayload(value: unknown): value is LineChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["series"]) &&
    v["series"].every(isLineSeries)
  );
}

mountWidget({
  name: "sigil-line-chart",
  isPayload: isLineChartPayload,
  View: LineChartView,
  loadingVariant: "line",
});
