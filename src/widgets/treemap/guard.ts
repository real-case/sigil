// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { TreemapPayload, TreemapNode } from "../../shared/payloads.js";

function isTreemapNode(value: unknown): value is TreemapNode {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v["label"] !== "string") return false;
  if (typeof v["value"] !== "number" || v["value"] < 0) return false;
  if (v["color"] !== undefined && typeof v["color"] !== "string") return false;
  if (v["children"] !== undefined) {
    if (!Array.isArray(v["children"])) return false;
    if (!v["children"].every(isTreemapNode)) return false;
  }
  return true;
}

export function isTreemapPayload(value: unknown): value is TreemapPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isTreemapNode)
  );
}
