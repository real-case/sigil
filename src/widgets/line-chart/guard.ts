// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type {
  LineChartPayload,
  LineSeries,
  LineDatum,
} from "../../shared/payloads.js";

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
