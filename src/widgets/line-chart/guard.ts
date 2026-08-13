// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type {
  LineChartPayload,
  LineSeries,
  LineDatum,
} from "../../shared/payloads.js";
import {
  asRecord,
  isFiniteNumber,
  isNonEmptyArrayOf,
  isNonEmptyString,
  isOptionalString,
} from "../shared/guards.js";

function isLineDatum(value: unknown): value is LineDatum {
  const v = asRecord(value);
  if (!v) return false;
  // `x` is a bare z.string() in the schema — no min(1) — so "" is a legal
  // category label here even though titles and series names reject it.
  return (
    (typeof v["x"] === "string" || isFiniteNumber(v["x"])) && isFiniteNumber(v["y"])
  );
}

function isLineSeries(value: unknown): value is LineSeries {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["name"]) && isNonEmptyArrayOf(v["data"], isLineDatum)
  );
}

export function isLineChartPayload(value: unknown): value is LineChartPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) &&
    isNonEmptyArrayOf(v["series"], isLineSeries) &&
    isOptionalString(v["xlabel"]) &&
    isOptionalString(v["ylabel"])
  );
}
