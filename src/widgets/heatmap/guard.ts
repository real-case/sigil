// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { HeatmapPayload, HeatmapCell } from "../../shared/payloads.js";
import {
  asRecord,
  isFiniteNumber,
  isIntegerInRange,
  isNonEmptyArrayOf,
  isNonEmptyString,
  isOptionalString,
} from "../shared/guards.js";

function isHeatmapCell(value: unknown): value is HeatmapCell {
  const v = asRecord(value);
  if (!v) return false;
  // x and y are z.number().int().nonnegative() — matrix indices. Out-of-range
  // indices are rendered empty by design, so there is no upper bound to check.
  return (
    isIntegerInRange(v["x"], 0, Number.MAX_SAFE_INTEGER) &&
    isIntegerInRange(v["y"], 0, Number.MAX_SAFE_INTEGER) &&
    isFiniteNumber(v["value"])
  );
}

export function isHeatmapPayload(value: unknown): value is HeatmapPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) &&
    isNonEmptyArrayOf(v["xLabels"], isNonEmptyString) &&
    isNonEmptyArrayOf(v["yLabels"], isNonEmptyString) &&
    isNonEmptyArrayOf(v["cells"], isHeatmapCell) &&
    isOptionalString(v["xlabel"]) &&
    isOptionalString(v["ylabel"])
  );
}
