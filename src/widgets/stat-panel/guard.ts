// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { StatItem, StatPanelPayload } from "../../shared/payloads.js";

function isStatItem(value: unknown): value is StatItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["label"] === "string" &&
    (typeof v["value"] === "string" || typeof v["value"] === "number") &&
    (v["unit"] === undefined || typeof v["unit"] === "string") &&
    (v["delta"] === undefined || typeof v["delta"] === "number") &&
    (v["status"] === undefined || typeof v["status"] === "string")
  );
}

export function isStatPanelPayload(value: unknown): value is StatPanelPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["items"]) &&
    v["items"].length > 0 &&
    v["items"].every(isStatItem)
  );
}
