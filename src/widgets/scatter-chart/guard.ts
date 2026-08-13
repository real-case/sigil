// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type {
  ScatterChartPayload,
  ScatterSeries,
  ScatterDatum,
} from "../../shared/payloads.js";
import {
  asRecord,
  isFiniteNumber,
  isNonEmptyArrayOf,
  isNonEmptyString,
  isOptionalString,
} from "../shared/guards.js";

function isScatterDatum(value: unknown): value is ScatterDatum {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isFiniteNumber(v["x"]) &&
    isFiniteNumber(v["y"]) &&
    // z.number().positive().optional() — zero is not a legal marker size.
    (v["size"] === undefined || (isFiniteNumber(v["size"]) && v["size"] > 0))
  );
}

function isScatterSeries(value: unknown): value is ScatterSeries {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["name"]) && isNonEmptyArrayOf(v["data"], isScatterDatum)
  );
}

export function isScatterChartPayload(value: unknown): value is ScatterChartPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) &&
    isNonEmptyArrayOf(v["series"], isScatterSeries) &&
    isOptionalString(v["xlabel"]) &&
    isOptionalString(v["ylabel"])
  );
}
