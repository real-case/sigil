// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
//
// The other guard that is not a bare safeParse, and the only one deliberately
// LOOSER than its schema. `render_dashboard` enumerates the tileable widgets,
// but this accepts any non-empty type string: Tile resolves the type against
// WIDGET_VIEWS and degrades a single card when it cannot, so an unrecognised
// type — a newer server talking to a cached older bundle — costs one tile
// rather than the whole grid. An earlier version carried its own hardcoded set,
// drifted two entries behind the registry, and rejected every dashboard holding
// a sankey or map tile.
//
// Only `type` is relaxed; the rest of the tile — and of every section — still
// goes through the same schema builder the tool uses, so colSpan bounds,
// provenance and the one-level section rule are checked exactly as the tool
// checks them.
import type { DashboardPayload } from "../../shared/payloads.js";
import { dashboardSchemaFor } from "../../shared/schemas.js";
import { z } from "zod";

const permissiveSchema = dashboardSchemaFor(z.string().min(1));

export function isDashboardPayload(value: unknown): value is DashboardPayload {
  return permissiveSchema.safeParse(value).success;
}
