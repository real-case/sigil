import { TableView } from "./TableView.js";
import type {
  TableColumn,
  TablePayload,
  TableRow,
} from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

function isTableColumn(value: unknown): value is TableColumn {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["key"] === "string" &&
    typeof v["label"] === "string" &&
    (v["align"] === undefined ||
      v["align"] === "left" ||
      v["align"] === "right" ||
      v["align"] === "center")
  );
}

function isTableRow(value: unknown): value is TableRow {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Object.values(v).every(
    (cell) => typeof cell === "string" || typeof cell === "number",
  );
}

export function isTablePayload(value: unknown): value is TablePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["columns"]) &&
    v["columns"].every(isTableColumn) &&
    Array.isArray(v["rows"]) &&
    v["rows"].every(isTableRow) &&
    typeof v["sortable"] === "boolean" &&
    typeof v["filterable"] === "boolean"
  );
}

mountWidget({
  name: "sigil-table",
  isPayload: isTablePayload,
  View: TableView,
  loadingVariant: "table",
});
