import { useMemo, useState } from "react";
import type {
  ColumnAlign,
  TableColumn,
  TablePayload,
  TableRow,
} from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
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

function alignFor(
  col: TableColumn,
  isNumeric: boolean,
): ColumnAlign {
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
  const haystack = Object.values(row).map((v) => String(v).toLowerCase()).join("\u0001");
  return terms.every((t) => haystack.includes(t));
}

export function TableView({ payload }: { payload: TablePayload }) {
  const tokens = useTheme();
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
    <div className="mcpcharts-root mcpcharts-table-root">
      <div className="mcpcharts-header">
        <h2 className="mcpcharts-title">{title}</h2>
        <div className="mcpcharts-table-controls">
          {filterable && (
            <input
              type="search"
              className="mcpcharts-table-filter"
              placeholder="Filter…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter rows"
            />
          )}
          <Toolbar>
            <ToolbarButton label="Copy CSV" onAction={copyCsv} />
          </Toolbar>
        </div>
      </div>
      <div className="mcpcharts-table-scroll">
        {sorted.length === 0 ? (
          <p className="mcpcharts-table-empty">
            {rows.length === 0 ? "No data to display." : "No rows match the filter."}
          </p>
        ) : (
          <table className="mcpcharts-table">
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
                    const v = row[col.key];
                    return (
                      <td key={col.key} style={{ textAlign: align }}>
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
      <TableStyles tokens={tokens} />
    </div>
  );
}

function TableStyles({ tokens }: { tokens: ChartDesignTokens }) {
  const css = `
.mcpcharts-table-root { padding: 16px; }
.mcpcharts-table-controls { display: flex; gap: 8px; align-items: center; }
.mcpcharts-table-filter {
  background: ${tokens.surfaceBackground};
  color: ${tokens.textPrimary};
  border: 1px solid ${tokens.axisLine};
  border-radius: ${tokens.borderRadius}px;
  padding: 6px 10px;
  font-size: ${tokens.fontSize.label}px;
  font-family: inherit;
  outline: none;
  min-width: 160px;
}
.mcpcharts-table-filter:focus { border-color: ${tokens.seriesColors[0]}; }
.mcpcharts-table-scroll { flex: 1 1 auto; overflow: auto; border: 1px solid ${tokens.axisLine}; border-radius: ${tokens.borderRadius}px; background: ${tokens.surfaceBackground}; }
.mcpcharts-table { width: 100%; border-collapse: collapse; font-size: ${tokens.fontSize.label}px; color: ${tokens.textPrimary}; }
.mcpcharts-table thead th {
  position: sticky; top: 0;
  background: ${tokens.surfaceBackground};
  border-bottom: 1px solid ${tokens.axisLine};
  color: ${tokens.textSecondary};
  font-weight: 600;
  padding: 8px 12px;
  user-select: none;
}
.mcpcharts-table tbody td { padding: 8px 12px; border-bottom: 1px solid ${tokens.gridLine}; }
.mcpcharts-table tbody tr:last-child td { border-bottom: none; }
.mcpcharts-table tbody tr:hover td { background: ${tokens.gridLine}; }
.mcpcharts-table-empty { color: ${tokens.textMuted}; padding: 24px; text-align: center; }
`;
  return <style>{css}</style>;
}
