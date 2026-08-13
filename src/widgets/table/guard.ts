// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type {
  ColumnAlign,
  ColumnKind,
  TableColumn,
  TablePayload,
  TableRow,
} from "../../shared/payloads.js";
import {
  asRecord,
  isFiniteNumber,
  isNonEmptyArrayOf,
  isNonEmptyString,
  isOptionalBoolean,
  isOptionalOneOf,
} from "../shared/guards.js";

const ALIGNMENTS: readonly ColumnAlign[] = ["left", "right", "center"];
const KINDS: readonly ColumnKind[] = ["text", "sparkline"];

function isTableColumn(value: unknown): value is TableColumn {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["key"]) &&
    isNonEmptyString(v["label"]) &&
    isOptionalOneOf(v["align"], ALIGNMENTS) &&
    isOptionalOneOf(v["kind"], KINDS)
  );
}

// Row validation is column-aware: an array cell passes only when a matching
// column declares kind "sparkline" and every entry is a finite number. Scalars
// stay legal everywhere — including under sparkline columns — and unknown row
// keys keep the scalar-only rule.
//
// This is deliberately STRICTER than the tool schema, which types rows as a
// record of string | number | number[] and cannot see the column list from
// inside a row. The extra strictness is the point: an array under a text column
// has no rendering and would otherwise reach TableView as a stray object.
function isTableRow(value: unknown, sparklineKeys: ReadonlySet<string>): value is TableRow {
  const v = asRecord(value);
  if (!v) return false;
  return Object.entries(v).every(([key, cell]) => {
    if (Array.isArray(cell)) {
      return sparklineKeys.has(key) && cell.every(isFiniteNumber);
    }
    return typeof cell === "string" || isFiniteNumber(cell);
  });
}

export function isTablePayload(value: unknown): value is TablePayload {
  const v = asRecord(value);
  if (!v) return false;
  if (
    !isNonEmptyString(v["title"]) ||
    !isNonEmptyArrayOf(v["columns"], isTableColumn) ||
    // Rows may legitimately be empty — the schema allows it and TableView has
    // an empty state. Their contents are checked below, once the sparkline
    // columns are known.
    !Array.isArray(v["rows"]) ||
    // Both optional: the schema defaults each to true.
    !isOptionalBoolean(v["sortable"]) ||
    !isOptionalBoolean(v["filterable"])
  ) {
    return false;
  }
  const sparklineKeys: ReadonlySet<string> = new Set(
    v["columns"].filter((c) => c.kind === "sparkline").map((c) => c.key),
  );
  return v["rows"].every((row) => isTableRow(row, sparklineKeys));
}
