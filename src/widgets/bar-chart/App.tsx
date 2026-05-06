import { BarChartView } from "./BarChartView.js";
import type { BarChartPayload, BarDatum } from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

function isBarDatum(value: unknown): value is BarDatum {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["label"] === "string" &&
    typeof v["value"] === "number" &&
    (v["color"] === undefined || typeof v["color"] === "string")
  );
}

function isBarChartPayload(value: unknown): value is BarChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isBarDatum) &&
    (v["orientation"] === "vertical" || v["orientation"] === "horizontal")
  );
}

mountWidget({
  name: "sigil-bar-chart",
  isPayload: isBarChartPayload,
  View: BarChartView,
});
