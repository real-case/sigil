import { useMemo, useState } from "react";
import type {
  ColumnAlign,
  TableColumn,
  TablePayload,
  TableRow,
} from "../../shared/payloads.js";
import { Toolbar, ToolbarButton, CsvIcon } from "../shared/Toolbar.js";
import { EmptyState } from "../shared/EmptyState.js";
import { toCsv, copyText, type CsvCell } from "../shared/export-utils.js";

type SortState = { key: string; direction: "asc" | "desc" } | null;

function detectNumericColumn(rows: TableRow[], key: string): boolean {
  let seenValue = false;
  for (const row of rows) {
    const v = row[key];
    if (v === undefined || v === null || v === "") continue;
    seenValue = true;
    if (typeof v !== "number") return false;
  }
  return seenValue;
}

function alignFor(col: TableColumn, isNumeric: boolean): ColumnAlign {
  return col.align ?? (isNumeric ? "right" : "left");
}

function compareValues(a: unknown, b: unknown, direction: "asc" | "desc"): number {
  const emptyA = a === undefined || a === null || a === "";
  const emptyB = b === undefined || b === null || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  const mult = direction === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * mult;
  return String(a).localeCompare(String(b)) * mult;
}

function matchesFilter(row: TableRow, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = Object.values(row).map((v) => String(v).toLowerCase()).join("");
  return terms.every((t) => haystack.includes(t));
}

export function TableView({ payload }: { payload: TablePayload }) {
  const [sort, setSort] = useState<SortState>(null);
  const [filter, setFilter] = useState<string>("");

  const { title, columns, rows, sortable, filterable } = payload;

  const numericByKey = useMemo(
    () =>
      Object.fromEntries(columns.map((c) => [c.key, detectNumericColumn(rows, c.key)])),
    [columns, rows],
  );

  const filtered = useMemo(() => {
    const terms = filter
      .toLowerCase()
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return filterable && terms.length > 0
      ? rows.filter((r) => matchesFilter(r, terms))
      : rows;
  }, [rows, filter, filterable]);

  const sorted = useMemo(() => {
    if (!sort || !sortable) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => compareValues(a[sort.key], b[sort.key], sort.direction));
    return copy;
  }, [filtered, sort, sortable]);

  const onHeaderClick = (key: string) => {
    if (!sortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const copyCsv = () => {
    const header = columns.map((c) => c.label);
    const body: CsvCell[][] = sorted.map((row) =>
      columns.map((c) => (row[c.key] ?? "") as CsvCell),
    );
    return copyText(toCsv(header, body));
  };

  return (
    <div className="sigil-root sigil-table-root">
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
        <div className="sigil-table-controls">
          {filterable && (
            <input
              type="search"
              className="sigil-table-filter"
              placeholder="Filter…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter rows"
            />
          )}
          <Toolbar>
            <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          </Toolbar>
        </div>
      </div>
      <div className="sigil-table-scroll">
        {sorted.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? "No data to display" : "No matching rows"}
            description={
              rows.length === 0
                ? "The payload was empty."
                : "Try adjusting your filter terms."
            }
          />
        ) : (
          <table className="sigil-table">
            <thead>
              <tr>
                {columns.map((col) => {
                  const align = alignFor(col, numericByKey[col.key] ?? false);
                  const active = sort?.key === col.key;
                  const indicator = !sortable
                    ? ""
                    : active
                    ? sort!.direction === "asc"
                      ? " ↑"
                      : " ↓"
                    : "";
                  return (
                    <th
                      key={col.key}
                      style={{ textAlign: align, cursor: sortable ? "pointer" : "default" }}
                      onClick={() => onHeaderClick(col.key)}
                      aria-sort={
                        active
                          ? sort!.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      {col.label}
                      {indicator}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, ri) => (
                <tr key={ri}>
                  {columns.map((col) => {
                    const align = alignFor(col, numericByKey[col.key] ?? false);
                    const isNumeric = numericByKey[col.key] ?? false;
                    const v = row[col.key];
                    return (
                      <td
                        key={col.key}
                        style={{
                          textAlign: align,
                          fontFamily: isNumeric
                            ? "var(--sigil-font-mono)"
                            : "inherit",
                          fontVariantNumeric: isNumeric ? "tabular-nums" : "normal",
                        }}
                      >
                        {v === undefined || v === null ? "" : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <TableStyles />
    </div>
  );
}

function TableStyles() {
  const css = `
.sigil-table-root { padding: var(--sigil-space-lg); }
.sigil-table-controls { display: flex; gap: var(--sigil-space-sm); align-items: center; }
.sigil-table-filter {
  background: var(--sigil-surface);
  color: var(--sigil-text);
  border: 1px solid var(--sigil-border-default);
  border-radius: var(--sigil-radius-md);
  padding: 6px 10px;
  font-family: var(--sigil-font-sans);
  font-size: var(--sigil-font-label-size);
  outline: none;
  min-width: 160px;
  transition: border-color var(--sigil-duration-fast) var(--sigil-easing-standard);
}
.sigil-table-filter:hover { border-color: var(--sigil-border-strong); }
.sigil-table-filter:focus-visible {
  border-color: var(--sigil-series-0);
  outline: var(--sigil-focus-ring-width) solid var(--sigil-focus-ring);
  outline-offset: var(--sigil-focus-ring-offset);
}
.sigil-table-scroll {
  flex: 1 1 auto;
  overflow: auto;
  border: 1px solid var(--sigil-border-subtle);
  border-radius: var(--sigil-radius-lg);
  background: var(--sigil-surface);
  box-shadow: var(--sigil-shadow-low);
}
.sigil-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--sigil-font-sans);
  font-size: 12px;
  color: var(--sigil-text);
}
.sigil-table thead th {
  position: sticky;
  top: 0;
  background: var(--sigil-surface);
  border-bottom: 1px solid var(--sigil-border-subtle);
  color: var(--sigil-text-muted);
  font-family: var(--sigil-font-axis-cap-family);
  font-size: var(--sigil-font-axis-cap-size);
  font-weight: var(--sigil-font-axis-cap-weight);
  letter-spacing: var(--sigil-font-axis-cap-letter-spacing);
  text-transform: var(--sigil-font-axis-cap-transform);
  padding: 7px 10px;
  user-select: none;
}
.sigil-table thead th:hover { color: var(--sigil-text-secondary); }
.sigil-table tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--sigil-border-subtle);
}
.sigil-table tbody tr:last-child td { border-bottom: none; }
.sigil-table tbody tr {
  transition: background var(--sigil-duration-fast) var(--sigil-easing-standard);
}
.sigil-table tbody tr:hover td { background: var(--sigil-surface-sunken); }
`;
  return <style>{css}</style>;
}
