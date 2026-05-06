import { useMemo, useRef, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type {
  ScatterChartPayload,
  ScatterSeries,
} from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const DIMMED_OPACITY = 0.2;
const POINT_RANGE: [number, number] = [40, 320];

function seriesColor(index: number, tokens: ChartDesignTokens): string {
  return tokens.seriesColors[index % tokens.seriesColors.length]!;
}

function hasSizeEncoding(series: ScatterSeries[]): boolean {
  return series.some((s) => s.data.some((d) => typeof d.size === "number"));
}

export function ScatterChartView({ payload }: { payload: ScatterChartPayload }) {
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

  const sized = useMemo(() => hasSizeEncoding(series), [series]);

  const copyCsv = () => {
    const header = ["series", xlabel ?? "x", ylabel ?? "y", ...(sized ? ["size"] : [])];
    const body: CsvCell[][] = series.flatMap((s) =>
      s.data.map((d) => [s.name, d.x, d.y, ...(sized ? [d.size ?? ""] : [])]),
    );
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "scatter-chart", tokens.background);
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
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.gridLine} />
            <XAxis
              type="number"
              dataKey="x"
              name={xlabel ?? "x"}
              tick={axisStyle}
              stroke={tokens.axisLine}
              label={
                xlabel
                  ? { value: xlabel, position: "insideBottom", offset: -8, style: labelStyle }
                  : undefined
              }
            />
            <YAxis
              type="number"
              dataKey="y"
              name={ylabel ?? "y"}
              tick={axisStyle}
              stroke={tokens.axisLine}
              label={
                ylabel
                  ? { value: ylabel, angle: -90, position: "insideLeft", style: labelStyle }
                  : undefined
              }
            />
            {sized && (
              <ZAxis type="number" dataKey="size" range={POINT_RANGE} name="size" />
            )}
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: tokens.axisLine }}
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
            <Legend
              wrapperStyle={{ fontSize: tokens.fontSize.label, color: tokens.textSecondary }}
              onClick={(entry) => {
                if (typeof entry.value === "string") toggleSelection(entry.value);
              }}
            />
            {series.map((s, i) => (
              <Scatter
                key={s.name}
                name={s.name}
                data={s.data}
                fill={seriesColor(i, tokens)}
                fillOpacity={opacityFor(s.name)}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
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
