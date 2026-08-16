import { useMemo, useRef, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  ScatterChartPayload,
  ScatterSeries,
} from "../../shared/payloads.js";
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
import { chartLabel, countOf } from "../shared/chart-label.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const MUTED_OPACITY = 0.18;
const UNFOCUSED_OPACITY = 0.2;
const BASE_FILL_OPACITY = 0.7;
const POINT_RANGE: [number, number] = [40, 320];

function seriesColor(index: number, tokens: ChartDesignTokens): string {
  return tokens.series[index % tokens.series.length]!;
}

function hasSizeEncoding(series: ScatterSeries[]): boolean {
  return series.some((s) => s.data.some((d) => typeof d.size === "number"));
}

export function ScatterChartView({ payload }: { payload: ScatterChartPayload }) {
  const tokens = useTheme();
  const [focused, setFocused] = useState<number | null>(null);
  const [muted, setMuted] = useState<ReadonlySet<number>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, series, xlabel, ylabel } = payload;

  const totalPoints = useMemo(
    () => series.reduce((n, s) => n + s.data.length, 0),
    [series],
  );
  const sized = useMemo(() => hasSizeEncoding(series), [series]);

  const stats = useMemo(
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
    const header = ["series", xlabel ?? "x", ylabel ?? "y", ...(sized ? ["size"] : [])];
    const body: CsvCell[][] = series.flatMap((s) =>
      s.data.map((d) => [s.name, d.x, d.y, ...(sized ? [d.size ?? ""] : [])]),
    );
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "scatter-chart", tokens.surfaces.bg);
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

  return (
    <div className="sigil-root">
      <ChartHeader
        title={title}
        kpi={{
          value: fmtNumber(totalPoints),
          caption: totalPoints === 1 ? "point" : "points",
        }}
      >
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </ChartHeader>
      <div className="sigil-canvas" ref={canvasRef}>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart
            aria-label={chartLabel(
              title,
              "scatter chart",
              `${countOf(series.length, "series", "series")}, ${countOf(totalPoints, "point")}`,
            )}
            margin={{
              top: 12,
              right: 16,
              bottom: 8,
              left: ylabel ? 8 : 0,
            }}
          >
            <CartesianGrid strokeDasharray="2 5" stroke={tokens.chartLines.grid} />
            <XAxis
              type="number"
              dataKey="x"
              name={xlabel ?? "x"}
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
              type="number"
              dataKey="y"
              name={ylabel ?? "y"}
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
            {sized && (
              <ZAxis type="number" dataKey="size" range={POINT_RANGE} name="size" />
            )}
            <Tooltip
              cursor={{ strokeDasharray: "2 3", stroke: tokens.chartLines.axis }}
              content={(props) => (
                <SigilTooltip
                  active={props.active}
                  label={undefined}
                  hideLabel
                  payload={
                    props.payload?.map((p) => ({
                      color: typeof p.color === "string" ? p.color : undefined,
                      name: typeof p.name === "string" ? p.name : undefined,
                      dataKey: p.dataKey as string | number | undefined,
                      value:
                        typeof p.value === "number"
                          ? fmtNumber(p.value)
                          : (p.value as number | string | undefined),
                    }))
                  }
                />
              )}
            />
            {series.map((s, i) => (
              <Scatter
                key={s.name}
                name={s.name}
                data={s.data}
                fill={seriesColor(i, tokens)}
                fillOpacity={opacityFor(i) * BASE_FILL_OPACITY}
                isAnimationActive={false}
                onMouseEnter={() => setFocused(i)}
                onMouseLeave={() => setFocused(null)}
                onClick={() => toggleMute(i)}
                style={{
                  cursor: "pointer",
                  transition:
                    "fill-opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
                }}
              />
            ))}
          </ScatterChart>
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
