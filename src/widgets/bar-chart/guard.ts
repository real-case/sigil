// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type { BarChartPayload } from "../../shared/payloads.js";
import { barChartSchema } from "../../shared/schemas.js";

export function isBarChartPayload(value: unknown): value is BarChartPayload {
  return barChartSchema.safeParse(value).success;
}
