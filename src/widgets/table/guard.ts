// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type {
  TableColumn,
  TablePayload,
  TableRow,
} from "../../shared/payloads.js";

function isTableColumn(value: unknown): value is TableColumn {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["key"] === "string" &&
    typeof v["label"] === "string" &&
    (v["align"] === undefined ||
      v["align"] === "left" ||
      v["align"] === "right" ||
      v["align"] === "center") &&
    (v["kind"] === undefined || v["kind"] === "text" || v["kind"] === "sparkline")
  );
}

// Row validation is column-aware: an array cell passes only when a matching
// column declares kind "sparkline" and every entry is a finite number.
// Scalars stay legal everywhere — including under sparkline columns — and
// unknown row keys keep the scalar-only rule.
function isTableRow(value: unknown, sparklineKeys: ReadonlySet<string>): value is TableRow {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).every(([key, cell]) => {
    if (Array.isArray(cell)) {
      return (
        sparklineKeys.has(key) &&
        cell.every((n) => typeof n === "number" && Number.isFinite(n))
      );
    }
    return typeof cell === "string" || typeof cell === "number";
  });
}

export function isTablePayload(value: unknown): value is TablePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v["title"] !== "string" ||
    !Array.isArray(v["columns"]) ||
    !v["columns"].every(isTableColumn) ||
    !Array.isArray(v["rows"]) ||
    typeof v["sortable"] !== "boolean" ||
    typeof v["filterable"] !== "boolean"
  ) {
    return false;
  }
  const sparklineKeys: ReadonlySet<string> = new Set(
    v["columns"].filter((c) => c.kind === "sparkline").map((c) => c.key),
  );
  return v["rows"].every((row) => isTableRow(row, sparklineKeys));
}
