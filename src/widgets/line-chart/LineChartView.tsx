import { useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { LineChartPayload, LineSeries } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const DIMMED_OPACITY = 0.2;
const STROKE_TRANSITION = "stroke-opacity 150ms ease";

type MergedRow = { x: string | number } & Record<string, unknown>;

function isAllNumeric(series: LineSeries[]): boolean {
  return series.every((s) => s.data.every((d) => typeof d.x === "number"));
}

function mergeSeries(series: LineSeries[]): MergedRow[] {
  const byX = new Map<string | number, MergedRow>();
  for (const s of series) {
    for (const { x, y } of s.data) {
      const existing = byX.get(x);
      if (existing) {
        existing[s.name] = y;
      } else {
        byX.set(x, { x, [s.name]: y });
      }
    }
  }
  const rows = Array.from(byX.values());
  const numeric = series.length > 0 && isAllNumeric(series);
  if (numeric) {
    rows.sort((a, b) => (a.x as number) - (b.x as number));
  }
  return rows;
}

function seriesColor(index: number, tokens: ChartDesignTokens): string {
  return tokens.seriesColors[index % tokens.seriesColors.length]!;
}

export function LineChartView({ payload }: { payload: LineChartPayload }) {
  const tokens = useTheme();
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, series, xlabel, ylabel } = payload;

  const totalPoints = useMemo(
    () => series.reduce((n, s) => n + s.data.length, 0),
    [series],
  );

  if (series.length === 0 || totalPoints === 0) {
    return <EmptyState title={title} />;
  }

  const rows = useMemo(() => mergeSeries(series), [series]);
  const numericX = useMemo(() => isAllNumeric(series), [series]);

  const copyCsv = () => {
    const header = [xlabel ?? "x", ...series.map((s) => s.name)];
    const body: CsvCell[][] = rows.map((row) => [
      row.x as CsvCell,
      ...series.map((s) => (row[s.name] as CsvCell) ?? ""),
    ]);
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "line-chart", tokens.background);
  };

  const opacityFor = (name: string) =>
    selectedSeries === null || selectedSeries === name ? 1 : DIMMED_OPACITY;
  const toggleSelection = (name: string) =>
    setSelectedSeries((prev) => (prev === name ? null : name));

  const axisStyle = { fontSize: tokens.fontSize.label, fill: tokens.textSecondary };
  const labelStyle = { fill: tokens.textSecondary, fontSize: tokens.fontSize.label };
  const tooltipStyle = {
    background: tokens.tooltipBackground,
    border: `1px solid ${tokens.tooltipBorder}`,
    borderRadius: tokens.borderRadius,
    color: tokens.tooltipText,
    fontSize: tokens.fontSize.tooltip,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  };
  const tooltipLabelStyle = { color: tokens.tooltipText, fontWeight: 600 };
  const tooltipItemStyle = { color: tokens.tooltipText };

  return (
    <div className="sigil-root">
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
        <Toolbar>
          <ToolbarButton label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </div>
      <div className="sigil-canvas" ref={canvasRef}>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.gridLine} />
            <XAxis
              dataKey="x"
              type={numericX ? "number" : "category"}
              domain={numericX ? ["dataMin", "dataMax"] : undefined}
              tick={axisStyle}
              stroke={tokens.axisLine}
              label={
                xlabel
                  ? { value: xlabel, position: "insideBottom", offset: -8, style: labelStyle }
                  : undefined
              }
            />
            <YAxis
              tick={axisStyle}
              stroke={tokens.axisLine}
              label={
                ylabel
                  ? { value: ylabel, angle: -90, position: "insideLeft", style: labelStyle }
                  : undefined
              }
            />
            <Tooltip
              cursor={{ stroke: tokens.axisLine, strokeWidth: 1, strokeDasharray: "3 3" }}
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
            <Legend
              wrapperStyle={{ fontSize: tokens.fontSize.label, color: tokens.textSecondary }}
              onClick={(entry) => {
                if (typeof entry.dataKey === "string") toggleSelection(entry.dataKey);
              }}
            />
            {series.map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={seriesColor(i, tokens)}
                strokeWidth={2}
                strokeOpacity={opacityFor(s.name)}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                style={{ transition: STROKE_TRANSITION, cursor: "pointer" }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="sigil-root sigil-empty">
      <h2 className="sigil-title">{title}</h2>
      <p>No data to display.</p>
    </div>
  );
}
