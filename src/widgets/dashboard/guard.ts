// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
//
// This guard deliberately does NOT know which widget types are tileable. It
// used to carry a hardcoded set, which drifted two entries behind the registry
// (sankey and map were tileable everywhere except here) and rejected the whole
// dashboard payload rather than the one tile at fault. Tile resolves the type
// against WIDGET_VIEWS and degrades a single tile instead, so an unrecognised
// type — a newer server talking to a cached older bundle, say — costs one tile
// rather than the entire grid.
import type { DashboardPayload, DashboardTile } from "../../shared/payloads.js";

function isDashboardTile(value: unknown): value is DashboardTile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["type"] === "string" &&
    v["type"].length > 0 &&
    typeof v["payload"] === "object" &&
    v["payload"] !== null &&
    (v["colSpan"] === undefined || typeof v["colSpan"] === "number")
  );
}

export function isDashboardPayload(value: unknown): value is DashboardPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["tiles"]) &&
    v["tiles"].length > 0 &&
    v["tiles"].every(isDashboardTile)
  );
}
