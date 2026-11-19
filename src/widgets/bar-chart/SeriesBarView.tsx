// Multi-series bars: grouped (`stack: "none"`), stacked (`"normal"`, with
// negative parts below zero), 100% stacked (`"percent"`), and line marks over
// any of them. The single-series pill chart stays in BarChartView, untouched.
//
// How the single-series look degrades here, per composition item 5:
// - No lane tracks and no value labels at bar ends — with several bars or
//   segments per category they collide. The numeric axis comes back instead,
//   and the tooltip lists every series in the hovered category.
// - The header KPI is the sum of every bar value ("net total" once any value
//   is negative); line marks are excluded, being a different measure.
// - Percent values use the pie chart's share format (fmtShare).
// - A series' `color` beats the palette; otherwise series i takes slot i.
// - Bars are not clickable: the legend mutes and focuses series, which keeps
//   the plot out of the keyboard sequence instead of adding a second one.

import { useMemo, useRef } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { BarChartPayload, BarSeries } from "../../shared/payloads.js";
import { useTheme, seriesColor, type ChartDesignTokens } from "../shared/theme.js";
import { seriesDash, useMediaQuery } from "../shared/use-media-query.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip, type TooltipRow } from "../shared/SigilTooltip.js";
import { ValueLegend } from "../shared/ValueLegend.js";
import { referenceHeadroom, referenceMarks } from "../shared/ReferenceLayer.js";
import {
  tickTextStyle,
  categoryTextStyle,
  axisCapTextStyle,
  fmtNumber,
  fmtCompact,
  fmtShare,
  fmtStat,
} from "../shared/chart-text.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";
import { useLegendState } from "../shared/legend-state.js";
import { percentDomain, seriesTotal, stackLayout, type StackRow } from "./stack-layout.js";

const GROUPED_BAR_SIZE = 22;
const STACKED_BAR_SIZE = 38;
const GROUPED_RADIUS = 3;
// Hairline in the surface colour between stacked segments, so neighbouring
// segments read as separate parts even where their hues are close.
const SEGMENT_GAP = 1.5;
const LINE_STROKE_WIDTH = 2.4;
const HORIZONTAL_ROW_STACKED = 46;
const HORIZONTAL_ROW_PER_BAR = 18;
const HORIZONTAL_LABEL_MAX = 16;
const VERTICAL_LABEL_MAX = 12;
const ROTATE_AFTER_ITEMS = 6;
const ROTATE_AFTER_LABEL_LEN = 7;

const truncateLabel = (s: string, max: number): string =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`;

const isLine = (s: BarSeries) => s.mark === "line";

function colorOf(s: BarSeries, i: number, tokens: ChartDesignTokens): string {
  return s.color ?? seriesColor(tokens, i);
}

export function SeriesBarView({
  payload,
  series,
}: {
  payload: BarChartPayload;
  series: readonly BarSeries[];
}) {
  const tokens = useTheme();
  const forcedColors = useMediaQuery("(forced-colors: active)");
  const { focused, muted, setFocused, toggleMute, opacityFor } =
    useLegendState({ unfocusedOpacity: 0.32 });
  const canvasRef = useRef<HTMLDivElement>(null);
  // Defaults mirror the render_bar_chart handler, for the tile path.
  const {
    title,
    stack = "none",
    orientation = "vertical",
    xlabel,
    ylabel,
    ylabelRight,
    reference,
  } = payload;
  const isHorizontal = orientation === "horizontal";
  const stacked = stack !== "none";
  const percent = stack === "percent";

  const { rows, categories } = useMemo(
    () => stackLayout(series, stack, muted),
    [series, stack, muted],
  );
  const totals = useMemo(() => series.map(seriesTotal), [series]);

  const barIdx = series.flatMap((s, i) => (isLine(s) ? [] : [i]));
  const hasRight = !isHorizontal && series.some((s) => s.axis === "right");
  const anyNegative = series.some((s) => !isLine(s) && s.data.some((d) => d.value < 0));
  const anyPositive = series.some((s) => !isLine(s) && s.data.some((d) => d.value > 0));
  const barTotal = barIdx.reduce((sum, i) => sum + totals[i]!, 0);
  const longestLabel = categories.reduce((m, c) => Math.max(m, c.length), 0);
  const needsRotation =
    !isHorizontal &&
    (categories.length > ROTATE_AFTER_ITEMS || longestLabel > ROTATE_AFTER_LABEL_LEN);

  const copyCsv = () =>
    copyText(
      toCsv(
        [xlabel ?? "label", ...series.map((s) => s.name)],
        rows.map((r): CsvCell[] => [r.label, ...r.raw.map((v) => v ?? "")]),
      ),
    );

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "bar-chart", tokens.surfaces.bg);
  };

  const tickStyle = tickTextStyle(tokens);
  const categoryStyle = categoryTextStyle(tokens);
  const capStyle = axisCapTextStyle(tokens);
  const valueTick = (v: number) => (percent ? `${Math.round(v)}%` : fmtCompact(v));
  const caption = [xlabel, ylabel].filter(Boolean).join(" · ");

  const chartHeight = isHorizontal
    ? Math.max(
        220,
        Math.min(
          categories.length *
            (stacked
              ? HORIZONTAL_ROW_STACKED
              : barIdx.length * HORIZONTAL_ROW_PER_BAR + 24) +
            40,
          640,
        ),
      )
    : 360;

  const kind = [
    isHorizontal ? "horizontal" : "",
    stack === "none" ? "grouped" : stack === "normal" ? "stacked" : "100% stacked",
    "bar chart",
    series.some(isLine) ? "with line overlay" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Shares are honest only when every bar is a non-negative part of the total.
  const shareable = !anyNegative && barTotal > 0 && barIdx.length > 1;
  const maxAbsTotal = Math.max(...totals.map((t) => Math.abs(t)), 0);
  const legendItems = series.map((s, i) =>
    isLine(s)
      ? {
          name: s.name,
          color: colorOf(s, i, tokens),
          value: fmtStat(s.data.length ? totals[i]! / s.data.length : 0),
          suffix: "avg",
        }
      : {
          name: s.name,
          color: colorOf(s, i, tokens),
          value: fmtNumber(totals[i]!),
          suffix: shareable ? fmtShare(totals[i]! / barTotal) : undefined,
          meter: maxAbsTotal > 0 ? (Math.abs(totals[i]!) / maxAbsTotal) * 100 : 0,
        },
  );

  const tooltipRows = (row: StackRow): TooltipRow[] => {
    const out: TooltipRow[] = [];
    series.forEach((s, i) => {
      const raw = row.raw[i];
      if (muted.has(i) || raw === undefined) return;
      const plotted = row.plot[i] ?? 0;
      out.push({
        color: colorOf(s, i, tokens),
        name: s.name,
        dataKey: String(i),
        value:
          percent && !isLine(s)
            ? `${fmtShare(plotted / 100)} · ${fmtNumber(raw)}`
            : fmtNumber(raw),
      });
    });
    if (stacked && barIdx.length > 1) {
      out.push({
        name: anyNegative ? "Net" : "Total",
        dataKey: "total",
        value: fmtNumber(row.positive + row.negative),
      });
    }
    return out;
  };

  const leftId = isHorizontal ? undefined : "left";
  const valueDomain = percent ? percentDomain(rows) : undefined;
  // Fixed ticks: Recharts' own land on 100.0000001% after float summation.
  const valueTicks = valueDomain
    ? valueDomain[0] < 0
      ? [-100, -50, 0, 50, 100]
      : [0, 25, 50, 75, 100]
    : undefined;

  return (
    <div className="sigil-root">
      <ChartHeader
        title={title}
        kpi={{ value: fmtCompact(barTotal), caption: anyNegative ? "net total" : "total" }}
      >
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </ChartHeader>
      <div className="sigil-split">
        <div className="sigil-plot">
          <div className="sigil-canvas" ref={canvasRef}>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart
                aria-label={chartLabel(
                  title,
                  kind,
                  `${countOf(series.length, "series", "series")} across ${countOf(categories.length, "category", "categories")}`,
                )}
                data={rows}
                layout={isHorizontal ? "vertical" : "horizontal"}
                stackOffset={stacked ? "sign" : undefined}
                margin={{ top: 12 + referenceHeadroom(reference), right: 16, bottom: 8, left: 8 }}
                barCategoryGap={stacked ? "28%" : "18%"}
                barGap={2}
              >
                <CartesianGrid
                  strokeDasharray="2 5"
                  stroke={tokens.chartLines.grid}
                  horizontal={!isHorizontal}
                  vertical={isHorizontal}
                />
                {isHorizontal ? (
                  <>
                    <XAxis
                      type="number"
                      domain={valueDomain}
                      ticks={valueTicks}
                      tick={tickStyle}
                      tickFormatter={valueTick}
                      axisLine={false}
                      tickLine={false}
                      height={30}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={Math.max(56, Math.min(28 + Math.min(longestLabel, HORIZONTAL_LABEL_MAX) * 7.5, 176))}
                      tick={categoryStyle}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => truncateLabel(v, HORIZONTAL_LABEL_MAX)}
                      interval={0}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      type="category"
                      dataKey="label"
                      tick={categoryStyle}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tickFormatter={(v: string) => truncateLabel(v, VERTICAL_LABEL_MAX)}
                      height={needsRotation ? 80 : 34}
                      angle={needsRotation ? -35 : 0}
                      textAnchor={needsRotation ? "end" : "middle"}
                    />
                    <YAxis
                      yAxisId="left"
                      type="number"
                      domain={valueDomain}
                      ticks={valueTicks}
                      tick={tickStyle}
                      tickFormatter={valueTick}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                    />
                    {hasRight && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        type="number"
                        tick={tickStyle}
                        tickFormatter={(v: number) => fmtCompact(v)}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        label={{
                          value: ylabelRight,
                          angle: 90,
                          position: "insideRight",
                          textAnchor: "middle",
                          style: capStyle,
                        }}
                      />
                    )}
                  </>
                )}
                {anyNegative && anyPositive && (
                  <ReferenceLine
                    {...(isHorizontal ? { x: 0 } : { y: 0, yAxisId: "left" })}
                    stroke={tokens.chartLines.axis}
                    strokeWidth={1.5}
                  />
                )}
                {referenceMarks(reference, tokens, {
                  swapped: isHorizontal,
                  valueAxisId: leftId,
                })}
                <Tooltip
                  cursor={{ fill: tokens.surfaces.surfaceSunken, fillOpacity: 0.7 }}
                  content={(props) => {
                    const row = props.payload?.[0]?.payload as StackRow | undefined;
                    if (!props.active || !row) return <SigilTooltip active={false} />;
                    return <SigilTooltip active label={row.label} payload={tooltipRows(row)} />;
                  }}
                />
                {series.map((s, i) => {
                  const color = colorOf(s, i, tokens);
                  const axisId = isHorizontal ? {} : { yAxisId: s.axis === "right" ? "right" : "left" };
                  if (isLine(s)) {
                    return (
                      <Line
                        key={`${i}-${s.name}`}
                        name={s.name}
                        type="monotone"
                        dataKey={(r: StackRow) => r.plot[i]}
                        {...axisId}
                        hide={muted.has(i)}
                        stroke={color}
                        strokeWidth={LINE_STROKE_WIDTH}
                        strokeDasharray={forcedColors ? seriesDash(i) : undefined}
                        strokeOpacity={opacityFor(i)}
                        dot={{ r: 3, fill: color, stroke: tokens.surfaces.surface, strokeWidth: 1.5 }}
                        activeDot={{ r: 4.5, fill: color, stroke: tokens.surfaces.surface, strokeWidth: 2 }}
                        isAnimationActive={false}
                        connectNulls
                      />
                    );
                  }
                  return (
                    <Bar
                      key={`${i}-${s.name}`}
                      name={s.name}
                      dataKey={(r: StackRow) => r.plot[i]}
                      {...axisId}
                      stackId={stacked ? "stack" : undefined}
                      hide={muted.has(i)}
                      fill={color}
                      fillOpacity={opacityFor(i)}
                      stroke={stacked ? tokens.surfaces.surface : undefined}
                      strokeWidth={stacked ? SEGMENT_GAP : 0}
                      radius={stacked ? 0 : GROUPED_RADIUS}
                      maxBarSize={stacked ? STACKED_BAR_SIZE : GROUPED_BAR_SIZE}
                      isAnimationActive={false}
                    />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {caption && <div className="sigil-caption">{caption}</div>}
        </div>
        <ValueLegend
          items={legendItems}
          focused={focused}
          muted={muted}
          onFocus={setFocused}
          onToggleMute={toggleMute}
        />
      </div>
    </div>
  );
}
