// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { BarChartPayload, BarDatum, Orientation } from "../../shared/payloads.js";
import {
  asRecord,
  isFiniteNumber,
  isNonEmptyArrayOf,
  isNonEmptyString,
  isOptionalOneOf,
  isOptionalString,
} from "../shared/guards.js";

const ORIENTATIONS: readonly Orientation[] = ["vertical", "horizontal"];

function isBarDatum(value: unknown): value is BarDatum {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["label"]) &&
    isFiniteNumber(v["value"]) &&
    isOptionalString(v["color"])
  );
}

export function isBarChartPayload(value: unknown): value is BarChartPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) &&
    isNonEmptyArrayOf(v["data"], isBarDatum) &&
    // Optional: the schema defaults it to "vertical", and a tile carries the
    // schema's shape, not the handler's output.
    isOptionalOneOf(v["orientation"], ORIENTATIONS) &&
    isOptionalString(v["xlabel"]) &&
    isOptionalString(v["ylabel"])
  );
}
