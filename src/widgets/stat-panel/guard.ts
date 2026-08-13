// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { StatItem, StatPanelPayload, StatStatus } from "../../shared/payloads.js";
import {
  asRecord,
  isFiniteNumber,
  isIntegerInRange,
  isNonEmptyArrayOf,
  isNonEmptyString,
  isOptionalArrayOf,
  isOptionalBoolean,
  isOptionalFiniteNumber,
  isOptionalOneOf,
  isOptionalString,
} from "../shared/guards.js";

const STATUSES: readonly StatStatus[] = ["success", "warning", "danger", "info"];

// Every optional the schema declares is checked. The previous version stopped
// after label/value/unit/delta/status, so `trend: "oops"` or `target: {}`
// reached StatPanelView unchallenged — harmless at the top level, where zod had
// already run, and the whole of the validation for a dashboard tile.
function isStatItem(value: unknown): value is StatItem {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["label"]) &&
    (typeof v["value"] === "string" || isFiniteNumber(v["value"])) &&
    isOptionalString(v["unit"]) &&
    isOptionalFiniteNumber(v["delta"]) &&
    isOptionalString(v["deltaUnit"]) &&
    isOptionalString(v["deltaCaption"]) &&
    isOptionalBoolean(v["higherIsBetter"]) &&
    isOptionalString(v["description"]) &&
    isOptionalOneOf(v["status"], STATUSES) &&
    isOptionalArrayOf(v["trend"], isFiniteNumber) &&
    isOptionalFiniteNumber(v["target"]) &&
    isOptionalString(v["badge"])
  );
}

export function isStatPanelPayload(value: unknown): value is StatPanelPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) &&
    isNonEmptyArrayOf(v["items"], isStatItem) &&
    (v["columns"] === undefined || isIntegerInRange(v["columns"], 1, 4))
  );
}
