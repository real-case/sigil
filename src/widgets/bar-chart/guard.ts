// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { BarChartPayload, BarDatum } from "../../shared/payloads.js";

function isBarDatum(value: unknown): value is BarDatum {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["label"] === "string" &&
    typeof v["value"] === "number" &&
    (v["color"] === undefined || typeof v["color"] === "string")
  );
}

export function isBarChartPayload(value: unknown): value is BarChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isBarDatum) &&
    (v["orientation"] === "vertical" || v["orientation"] === "horizontal")
  );
}
