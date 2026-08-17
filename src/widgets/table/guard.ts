// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
//
// One of two guards that is not a bare safeParse. The schema types a row as a
// record of string | number | number[], because from inside a row it cannot see
// the column list; but an array cell only renders under a column declaring
// `kind: "sparkline"`, and anywhere else it would reach TableView as a stray
// object. So the schema runs first and this adds the column-aware rule on top —
// deliberately stricter than the tool accepts, and the only such divergence for
// this widget.
import type { TablePayload } from "../../shared/payloads.js";
import { tableSchema } from "../../shared/schemas.js";

export function isTablePayload(value: unknown): value is TablePayload {
  const parsed = tableSchema.safeParse(value);
  if (!parsed.success) return false;

  const sparklineKeys = new Set(
    parsed.data.columns.filter((c) => c.kind === "sparkline").map((c) => c.key),
  );
  return parsed.data.rows.every((row) =>
    Object.entries(row).every(
      ([key, cell]) => !Array.isArray(cell) || sparklineKeys.has(key),
    ),
  );
}
