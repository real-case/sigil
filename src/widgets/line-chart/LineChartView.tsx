import { useId, useMemo, useRef, useState, type Key } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LineChartPayload, LineSeries } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { ValueLegend } from "../shared/ValueLegend.js";
import { EmptyState } from "../shared/EmptyState.js";
import {
  tickTextStyle,
  axisCapTextStyle,
  fmtNumber,
  fmtStat,
} from "../shared/chart-text.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const MUTED_OPACITY = 0.18;
const UNFOCUSED_OPACITY = 0.2;
const STROKE_WIDTH = 2.4;
const AREA_TOP_OPACITY = 0.18;
// Gradient fills read cleanly for a couple of series; beyond that the
// overlapping washes muddy the plot, so fall back to bare lines.
const AREA_FILL_MAX_SERIES = 3;
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

interface SeriesStats {
  avg: number;
  min: number;
  max: number;
}

export function LineChartView({ payload }: { payload: LineChartPayload }) {
  const tokens = useTheme();
  const [focused, setFocused] = useState<number | null>(null);
  const [muted, setMuted] = useState<ReadonlySet<number>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);
  const gradientUid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { title, series, xlabel, ylabel } = payload;

  const totalPoints = useMemo(
    () => series.reduce((n, s) => n + s.data.length, 0),
    [series],
  );
  const rows = useMemo(() => mergeSeries(series), [series]);
  const numericX = useMemo(() => isAllNumeric(series), [series]);

  // Last merged-row index at which each series has a value → end-dot anchors.
  const lastIndexBySeries = useMemo(
    () =>
      series.map((s) => {
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i]![s.name] != null) return i;
        }
        return -1;
      }),
    [rows, series],
  );

  const stats: SeriesStats[] = useMemo(
    () =>
      series.map((s) => {
        const ys = s.data.map((d) => d.y);
        const sum = ys.reduce((a, b) => a + b, 0);
        return {
          avg: ys.length > 0 ? sum / ys.length : 0,
          min: ys.length > 0 ? Math.min(...ys) : 0,
          max: ys.length > 0 ? Math.max(...ys) : 0,
        };
      }),
    [series],
  );

  if (series.length === 0 || totalPoints === 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

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

  const toggleMute = (i: number) =>
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const opacityFor = (i: number) =>
    muted.has(i)
      ? MUTED_OPACITY
      : focused !== null && focused !== i
        ? UNFOCUSED_OPACITY
        : 1;

  // Legend range positions, relative to the plotted floor (0 for all-positive
  // data, dataMin otherwise) → max across every series.
  const globalMin = Math.min(...stats.map((s) => s.min));
  const globalMax = Math.max(...stats.map((s) => s.max));
  const floor = Math.min(0, globalMin);
  const span = globalMax - floor;
  const pos = (v: number) => (span > 0 ? ((v - floor) / span) * 100 : 50);

  const tickStyle = tickTextStyle(tokens);
  const capStyle = axisCapTextStyle(tokens);

  const legendItems = series.map((s, i) => ({
    name: s.name,
    color: seriesColor(i, tokens),
    value: fmtStat(stats[i]!.avg),
    suffix: "avg",
    range: {
      lo: pos(stats[i]!.min),
      hi: pos(stats[i]!.max),
      avg: pos(stats[i]!.avg),
    },
  }));

  const primaryStats = stats[0]!;

  return (
    <div className="sigil-root">
      <ChartHeader
        title={title}
        kpi={{
          value: fmtStat(primaryStats.avg),
          caption: `${series[0]!.name} avg`,
        }}
      >
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </ChartHeader>
      <div className="sigil-canvas" ref={canvasRef}>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart
            data={rows}
            margin={{
              top: 12,
              right: 16,
              bottom: 8,
              left: ylabel ? 8 : 0,
            }}
          >
            <defs>
              {series.map((s, i) => {
                const color = seriesColor(i, tokens);
                return (
                  <linearGradient
                    key={s.name}
                    id={`${gradientUid}-${i}`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={color}
                      stopOpacity={AREA_TOP_OPACITY}
                    />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              stroke={tokens.chartLines.grid}
              horizontal
              vertical={false}
            />
            <XAxis
              dataKey="x"
              type={numericX ? "number" : "category"}
              domain={numericX ? ["dataMin", "dataMax"] : undefined}
              tick={tickStyle}
              axisLine={{ stroke: tokens.chartLines.axis }}
              tickLine={false}
              height={xlabel ? 46 : 30}
              label={
                xlabel
                  ? {
                      value: xlabel,
                      position: "insideBottom",
                      offset: 0,
                      textAnchor: "middle",
                      style: capStyle,
                    }
                  : undefined
              }
            />
            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              width={ylabel ? 60 : 44}
              label={
                ylabel
                  ? {
                      value: ylabel,
                      angle: -90,
                      position: "insideLeft",
                      textAnchor: "middle",
                      style: capStyle,
                    }
                  : undefined
              }
            />

            <Tooltip
              cursor={{
                stroke: tokens.chartLines.axis,
                strokeWidth: 1,
                strokeDasharray: "2 3",
                strokeOpacity: 0.7,
              }}
              content={(props) => (
                <SigilTooltip
                  active={props.active}
                  label={
                    xlabel !== undefined
                      ? `${xlabel} ${String(props.label)}`
                      : (props.label as string | number | undefined)
                  }
                  payload={props.payload
                    ?.filter((p) => {
                      const idx = series.findIndex((s) => s.name === p.name);
                      return idx === -1 || !muted.has(idx);
                    })
                    .map((p) => ({
                      color: typeof p.color === "string" ? p.color : undefined,
                      name: typeof p.name === "string" ? p.name : undefined,
                      dataKey: p.dataKey as string | number | undefined,
                      value:
                        typeof p.value === "number"
                          ? fmtNumber(p.value)
                          : (p.value as number | string | undefined),
                    }))}
                />
              )}
            />
            {series.map((s, i) => {
              const color = seriesColor(i, tokens);
              const isMuted = muted.has(i);
              const sparse = s.data.length <= SPARSE_DOT_THRESHOLD;
              const endIndex = lastIndexBySeries[i]!;
              const opacity = opacityFor(i);
              const showFill = series.length <= AREA_FILL_MAX_SERIES;
              return (
                <Area
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={color}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={opacity}
                  fill={showFill ? `url(#${gradientUid}-${i})` : "transparent"}
                  fillOpacity={showFill ? opacity : 0}
                  dot={(dotProps: {
                    key?: Key | null;
                    index?: number;
                    cx?: number;
                    cy?: number;
                    value?: number;
                  }) => {
                    const { key, index, cx, cy, value } = dotProps;
                    const dotKey = key ?? `${s.name}-dot-${index}`;
                    if (
                      value == null ||
                      cx == null ||
                      cy == null ||
                      Number.isNaN(cx) ||
                      Number.isNaN(cy)
                    ) {
                      return <g key={dotKey} />;
                    }
                    const isEnd = index === endIndex;
                    if (!isEnd && !sparse) return <g key={dotKey} />;
                    return (
                      <circle
                        key={dotKey}
                        cx={cx}
                        cy={cy}
                        r={isEnd ? 4 : 3}
                        fill={color}
                        stroke={tokens.surfaces.surface}
                        strokeWidth={isEnd ? 2 : 1.5}
                        opacity={opacity}
                        style={{
                          transition:
                            "opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
                        }}
                      />
                    );
                  }}
                  activeDot={
                    isMuted
                      ? false
                      : {
                          r: 4.5,
                          fill: color,
                          strokeWidth: 2,
                          stroke: tokens.surfaces.surface,
                        }
                  }
                  isAnimationActive={false}
                  style={{
                    transition:
                      "stroke-opacity var(--sigil-duration-base) var(--sigil-easing-standard), fill-opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
                  }}
                  connectNulls
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ValueLegend
        items={legendItems}
        layout="row"
        focused={focused}
        muted={muted}
        onFocus={setFocused}
        onToggleMute={toggleMute}
      />
    </div>
  );
}
