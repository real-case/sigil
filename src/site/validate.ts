import type { ZodType } from "zod";
import {
  barChartSchema,
  dashboardSchema,
  heatmapSchema,
  lineChartSchema,
  mapSchema,
  pieChartSchema,
  sankeySchema,
  scatterChartSchema,
  statPanelSchema,
  tableSchema,
  treemapSchema,
} from "../shared/schemas.js";
import type { WidgetKey } from "../widgets/sandbox/datasets/index.js";
import { isBarChartPayload } from "../widgets/bar-chart/guard.js";
import { isDashboardPayload } from "../widgets/dashboard/guard.js";
import { isHeatmapPayload } from "../widgets/heatmap/guard.js";
import { isLineChartPayload } from "../widgets/line-chart/guard.js";
import { isMapPayload } from "../widgets/map/guard.js";
import { isPieChartPayload } from "../widgets/pie-chart/guard.js";
import { isSankeyPayload } from "../widgets/sankey/guard.js";
import { isScatterChartPayload } from "../widgets/scatter-chart/guard.js";
import { isStatPanelPayload } from "../widgets/stat-panel/guard.js";
import { isTablePayload } from "../widgets/table/guard.js";
import { isTreemapPayload } from "../widgets/treemap/guard.js";

// The playground runs the same checks a real host does: the tool's zod schema
// (which is what the model sees) and the widget's own guard. The guard decides
// whether the widget renders — table is stricter and dashboard looser than a
// bare safeParse — and the schema supplies the readable message when it won't.
const CHECKS: Record<WidgetKey, { schema: ZodType; guard: (v: unknown) => boolean }> = {
  "bar-chart": { schema: barChartSchema, guard: isBarChartPayload },
  "line-chart": { schema: lineChartSchema, guard: isLineChartPayload },
  "pie-chart": { schema: pieChartSchema, guard: isPieChartPayload },
  table: { schema: tableSchema, guard: isTablePayload },
  "scatter-chart": { schema: scatterChartSchema, guard: isScatterChartPayload },
  heatmap: { schema: heatmapSchema, guard: isHeatmapPayload },
  treemap: { schema: treemapSchema, guard: isTreemapPayload },
  "stat-panel": { schema: statPanelSchema, guard: isStatPanelPayload },
  sankey: { schema: sankeySchema, guard: isSankeyPayload },
  dashboard: { schema: dashboardSchema, guard: isDashboardPayload },
  map: { schema: mapSchema, guard: isMapPayload },
};

export type CheckResult =
  | { ok: true; payload: unknown }
  | { ok: false; kind: "empty" | "json" | "schema"; problems: string[] };

function formatPath(path: readonly PropertyKey[]): string {
  let out = "";
  for (const seg of path) {
    out += typeof seg === "number" ? `[${seg}]` : out ? `.${String(seg)}` : String(seg);
  }
  return out || "arguments";
}

function valueAt(root: unknown, path: readonly PropertyKey[]): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<PropertyKey, unknown>)[seg];
  }
  return cur;
}

function describeValue(v: unknown): string {
  if (v === undefined) return "missing";
  const s = JSON.stringify(v);
  return s.length > 40 ? `${s.slice(0, 37)}…` : s;
}

const MAX_PROBLEMS = 4;

export function checkArguments(key: WidgetKey, text: string): CheckResult {
  if (text.trim() === "") {
    return { ok: false, kind: "empty", problems: ["The arguments are empty."] };
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, kind: "json", problems: [`Not valid JSON: ${msg}`] };
  }

  const { schema, guard } = CHECKS[key];
  if (guard(value)) return { ok: true, payload: value };

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const problems = issues
      .slice(0, MAX_PROBLEMS)
      .map((i) => `${formatPath(i.path)}: ${i.message} (got ${describeValue(valueAt(value, i.path))})`);
    if (issues.length > MAX_PROBLEMS) problems.push(`…and ${issues.length - MAX_PROBLEMS} more.`);
    return { ok: false, kind: "schema", problems };
  }
  return {
    ok: false,
    kind: "schema",
    problems: [
      key === "table"
        ? 'An array cell is only allowed under a column with kind "sparkline".'
        : "The widget's guard rejected these arguments.",
    ],
  };
}
