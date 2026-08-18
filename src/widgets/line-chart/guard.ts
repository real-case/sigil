// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
//
// The schema is the definition — see src/shared/schemas.ts. A dashboard tile
// never reaches the tool's zod validation, so for a tile this call IS the
// contract; running the same schema is what keeps the two paths honest.
import type { LineChartPayload } from "../../shared/payloads.js";
import { lineChartSchema } from "../../shared/schemas.js";

export function isLineChartPayload(value: unknown): value is LineChartPayload {
  return lineChartSchema.safeParse(value).success;
}
