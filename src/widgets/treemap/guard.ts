// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { TreemapPayload, TreemapNode } from "../../shared/payloads.js";
import {
  asRecord,
  isNonEmptyArrayOf,
  isNonEmptyString,
  isNonNegativeNumber,
  isOptionalArrayOf,
  isOptionalString,
} from "../shared/guards.js";

// Recursive, mirroring the schema's z.lazy. Tile calls guards inside a try —
// a payload nested deeply enough to exhaust the stack is caught there and
// degrades one tile, rather than escaping into the dashboard's render.
function isTreemapNode(value: unknown): value is TreemapNode {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["label"]) &&
    isNonNegativeNumber(v["value"]) &&
    isOptionalString(v["color"]) &&
    isOptionalArrayOf(v["children"], isTreemapNode)
  );
}

export function isTreemapPayload(value: unknown): value is TreemapPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) && isNonEmptyArrayOf(v["data"], isTreemapNode)
  );
}
