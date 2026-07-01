import { useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LineChartPayload, LineSeries } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { ChartLegend } from "../shared/ChartLegend.js";
import { EmptyState } from "../shared/EmptyState.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const DIMMED_OPACITY = 0.2;
// Below this many points per series, draw point markers: a dense line reads
// cleanly without them, but a sparse series (especially a single point, which
// forms no line segment at all) would otherwise render invisibly.
const SPARSE_DOT_THRESHOLD = 12;

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
  return tokens.series[index % tokens.series.length]!;
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
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
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
    await copySvgAsPng(svg as SVGSVGElement, "line-chart", tokens.surfaces.bg);
  };

  const opacityFor = (name: string) =>
    selectedSeries === null || selectedSeries === name ? 1 : DIMMED_OPACITY;
  const toggleSelection = (name: string) =>
    setSelectedSeries((prev) => (prev === name ? null : name));

  const tickStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: tokens.typography.scale.tick.fontSize,
    letterSpacing: `${tokens.typography.scale.tick.letterSpacing}em`,
    textTransform: "uppercase" as const,
    fill: tokens.texts.muted,
  };

  const axisLabelStyle = {
    fill: tokens.texts.secondary,
    fontSize: tokens.typography.scale.label.fontSize,
    fontFamily: tokens.typography.family.sans,
    textAnchor: "middle" as const,
  };

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
          <LineChart
            data={rows}
            margin={{
              top: 16,
              right: 16,
              bottom: 8,
              left: ylabel ? 24 : 8,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.chartLines.grid} />
            <XAxis
              dataKey="x"
              type={numericX ? "number" : "category"}
              domain={numericX ? ["dataMin", "dataMax"] : undefined}
              tick={tickStyle}
              stroke={tokens.chartLines.axis}
              height={xlabel ? 48 : 30}
              label={
                xlabel
                  ? {
                      value: xlabel,
                      position: "insideBottom",
                      offset: 0,
                      textAnchor: "middle",
                      style: axisLabelStyle,
                    }
                  : undefined
              }
            />
            <YAxis
              tick={tickStyle}
              stroke={tokens.chartLines.axis}
              width={ylabel ? 64 : 48}
              label={
                ylabel
                  ? {
                      value: ylabel,
                      angle: -90,
                      position: "insideLeft",
                      textAnchor: "middle",
                      style: axisLabelStyle,
                    }
                  : undefined
              }
            />

            <Tooltip
              cursor={{
                stroke: tokens.chartLines.axis,
                strokeWidth: 1,
                strokeDasharray: "3 3",
              }}
              content={(props) => (
                <SigilTooltip
                  active={props.active}
                  label={props.label as string | number | undefined}
                  payload={
                    props.payload?.map((p) => ({
                      color: typeof p.color === "string" ? p.color : undefined,
                      name: typeof p.name === "string" ? p.name : undefined,
                      dataKey: p.dataKey as string | number | undefined,
                      value: p.value as number | string | undefined,
                    }))
                  }
                />
              )}
            />
            {series.map((s, i) => {
              const isPrimary = i === 0;
              const color = seriesColor(i, tokens);
              const showDots = s.data.length <= SPARSE_DOT_THRESHOLD;
              const dotRadius = s.data.length === 1 ? 4 : isPrimary ? 2.75 : 2.25;
              return (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={color}
                  strokeWidth={isPrimary ? 1.75 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={opacityFor(s.name)}
                  dot={
                    showDots
                      ? {
                          r: dotRadius,
                          fill: color,
                          fillOpacity: opacityFor(s.name),
                          stroke: tokens.surfaces.surface,
                          strokeWidth: s.data.length === 1 ? 1.5 : 0,
                        }
                      : false
                  }
                  activeDot={{ r: 4, strokeWidth: 2, stroke: tokens.surfaces.surface }}
                  isAnimationActive={false}
                  style={{
                    transition:
                      "stroke-opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
                    cursor: "pointer",
                  }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
        <ChartLegend
          items={series.map((s, i) => ({
            name: s.name,
            color: seriesColor(i, tokens),
          }))}
          selected={selectedSeries}
          onToggle={toggleSelection}
        />
      </div>
    </div>
  );
}
