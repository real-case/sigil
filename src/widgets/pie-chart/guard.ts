// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { PieChartPayload, PieDatum, PieVariant } from "../../shared/payloads.js";
import {
  asRecord,
  isIntegerInRange,
  isNonEmptyArrayOf,
  isNonEmptyString,
  isNonNegativeNumber,
  isOptionalOneOf,
  isOptionalString,
} from "../shared/guards.js";

const VARIANTS: readonly PieVariant[] = ["pie", "donut"];

function isPieDatum(value: unknown): value is PieDatum {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["label"]) &&
    isNonNegativeNumber(v["value"]) &&
    isOptionalString(v["color"])
  );
}

export function isPieChartPayload(value: unknown): value is PieChartPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) &&
    isNonEmptyArrayOf(v["data"], isPieDatum) &&
    // Optional: the schema defaults it to "donut".
    isOptionalOneOf(v["variant"], VARIANTS) &&
    // z.number().int().min(2), with no upper bound.
    (v["maxSegments"] === undefined ||
      isIntegerInRange(v["maxSegments"], 2, Number.MAX_SAFE_INTEGER))
  );
}
