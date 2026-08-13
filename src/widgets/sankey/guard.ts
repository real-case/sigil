// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { SankeyPayload, SankeyNode, SankeyLink } from "../../shared/payloads.js";
import {
  asRecord,
  isNonEmptyArrayOf,
  isNonEmptyString,
  isNonNegativeNumber,
  isOptionalArrayOf,
  isOptionalString,
} from "../shared/guards.js";

function isSankeyNode(value: unknown): value is SankeyNode {
  const v = asRecord(value);
  if (!v) return false;
  return isNonEmptyString(v["name"]) && isOptionalString(v["color"]);
}

function isSankeyLink(value: unknown): value is SankeyLink {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["source"]) &&
    isNonEmptyString(v["target"]) &&
    isNonNegativeNumber(v["value"])
  );
}

export function isSankeyPayload(value: unknown): value is SankeyPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) &&
    // Optional: nodes are derived from the links when absent.
    isOptionalArrayOf(v["nodes"], isSankeyNode) &&
    isNonEmptyArrayOf(v["links"], isSankeyLink) &&
    isOptionalString(v["valueLabel"])
  );
}
