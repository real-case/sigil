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
//
// That makes `type` the one field here looser than the tool schema, which does
// enumerate the ten tileable widgets. The looseness is the feature; everything
// else below matches the schema.
import type { DashboardPayload, DashboardTile } from "../../shared/payloads.js";
import {
  asRecord,
  isIntegerInRange,
  isNonEmptyArrayOf,
  isNonEmptyString,
} from "../shared/guards.js";

function isDashboardTile(value: unknown): value is DashboardTile {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["type"]) &&
    asRecord(v["payload"]) !== null &&
    (v["colSpan"] === undefined || isIntegerInRange(v["colSpan"], 1, 4))
  );
}

export function isDashboardPayload(value: unknown): value is DashboardPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) &&
    (v["columns"] === undefined || isIntegerInRange(v["columns"], 1, 4)) &&
    isNonEmptyArrayOf(v["tiles"], isDashboardTile)
  );
}
