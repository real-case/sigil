import { PieChartView } from "./PieChartView.js";
import type { PieChartPayload, PieDatum } from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

function isPieDatum(value: unknown): value is PieDatum {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["label"] === "string" &&
    typeof v["value"] === "number" &&
    (v["color"] === undefined || typeof v["color"] === "string")
  );
}

export function isPieChartPayload(value: unknown): value is PieChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isPieDatum) &&
    (v["variant"] === "pie" || v["variant"] === "donut") &&
    (v["maxSegments"] === undefined ||
      (typeof v["maxSegments"] === "number" &&
        Number.isInteger(v["maxSegments"]) &&
        v["maxSegments"] >= 2))
  );
}

mountWidget({
  name: "sigil-pie-chart",
  isPayload: isPieChartPayload,
  View: PieChartView,
  loadingVariant: "pie",
});
