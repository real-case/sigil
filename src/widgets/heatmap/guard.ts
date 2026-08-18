// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
//
// The schema is the definition — see src/shared/schemas.ts. A dashboard tile
// never reaches the tool's zod validation, so for a tile this call IS the
// contract; running the same schema is what keeps the two paths honest.
import type { HeatmapPayload } from "../../shared/payloads.js";
import { heatmapSchema } from "../../shared/schemas.js";

export function isHeatmapPayload(value: unknown): value is HeatmapPayload {
  return heatmapSchema.safeParse(value).success;
}
