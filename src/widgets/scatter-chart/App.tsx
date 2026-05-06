import { ScatterChartView } from "./ScatterChartView.js";
import type {
  ScatterChartPayload,
  ScatterDatum,
  ScatterSeries,
} from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

function isScatterDatum(value: unknown): value is ScatterDatum {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["x"] === "number" &&
    typeof v["y"] === "number" &&
    (v["size"] === undefined || (typeof v["size"] === "number" && v["size"] > 0))
  );
}

function isScatterSeries(value: unknown): value is ScatterSeries {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["name"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isScatterDatum)
  );
}

function isScatterChartPayload(value: unknown): value is ScatterChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["series"]) &&
    v["series"].every(isScatterSeries)
  );
}

mountWidget({
  name: "sigil-scatter-chart",
  isPayload: isScatterChartPayload,
  View: ScatterChartView,
});
