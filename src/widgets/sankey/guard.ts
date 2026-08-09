// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { SankeyPayload, SankeyNode, SankeyLink } from "../../shared/payloads.js";

function isSankeyNode(value: unknown): value is SankeyNode {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v["name"] !== "string") return false;
  if (v["color"] !== undefined && typeof v["color"] !== "string") return false;
  return true;
}

function isSankeyLink(value: unknown): value is SankeyLink {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["source"] === "string" &&
    typeof v["target"] === "string" &&
    typeof v["value"] === "number" &&
    v["value"] >= 0
  );
}

export function isSankeyPayload(value: unknown): value is SankeyPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v["title"] !== "string") return false;
  if (!Array.isArray(v["links"]) || !v["links"].every(isSankeyLink)) return false;
  if (v["nodes"] !== undefined) {
    if (!Array.isArray(v["nodes"])) return false;
    if (!v["nodes"].every(isSankeyNode)) return false;
  }
  if (v["valueLabel"] !== undefined && typeof v["valueLabel"] !== "string") return false;
  return true;
}
