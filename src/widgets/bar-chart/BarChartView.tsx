import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Rectangle,
  useActiveTooltipDataPoints,
} from "recharts";
import type { BarChartPayload, BarDatum } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { ValueLegend } from "../shared/ValueLegend.js";
import { EmptyState } from "../shared/EmptyState.js";
import {
  tickTextStyle,
  categoryTextStyle,
  fmtNumber,
  fmtCompact,
  fmtShare,
} from "../shared/chart-text.js";
import { toCsv, copyText, copySvgAsPng } from "../shared/export-utils.js";

const MUTED_OPACITY = 0.18;
const UNFOCUSED_OPACITY = 0.32;
const BAR_RADIUS = 7;
const BAR_SIZE = 26;
const ROW_HEIGHT = 62;
const ROTATE_AFTER_ITEMS = 6;
const ROTATE_AFTER_LABEL_LEN = 7;
const HORIZONTAL_LABEL_MAX = 16;
// Vertical (category-on-X) ticks: truncate so rotated labels stay readable and
// don't overrun the plot. Wider cap when straight, tighter when rotated.
const VERTICAL_LABEL_MAX_STRAIGHT = 12;
const VERTICAL_LABEL_MAX_ROTATED = 16;
// Compact end labels on vertical bars once columns get narrow or numbers long,
// so neighbouring labels don't collide.
const VERTICAL_COMPACT_AFTER_ITEMS = 8;
const VERTICAL_COMPACT_AFTER_MAX = 100_000;
// Readability tiers for dense vertical charts. Past DENSE the bands get
// narrower than a compact value label, so labels stagger across two rows and
// category ticks tighten (smaller, steeper, shorter). Past VALUE_LABELS_MAX
// even staggered labels collide — the legend and tooltip carry the values.
const DENSE_AFTER_ITEMS = 12;
const VALUE_LABELS_MAX_ITEMS = 24;
const MAX_VISIBLE_CATEGORY_TICKS = 20;
const VERTICAL_LABEL_MAX_DENSE = 10;
const STAGGER_LIFT = 13;

const truncateLabel = (s: string, max: number): string =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`;

function colorFor(
  datum: { color?: string },
  index: number,
  tokens: ChartDesignTokens,
): string {
  return datum.color ?? tokens.series[index % tokens.series.length]!;
}

/**
 * Recharts 3 no longer passes chart state to mouse handlers; the active
 * (tooltip-hovered) band is read via a hook instead. Rendered as a chart
 * child so the hook sees the chart's context; draws nothing.
 */
function ActiveBandBridge({
  data,
  onFocus,
}: {
  data: readonly BarDatum[];
  onFocus: (index: number | null) => void;
}) {
  const points = useActiveTooltipDataPoints();
  const active = points?.[0] as BarDatum | undefined;
  const index = active
    ? (() => {
        const byIdentity = data.indexOf(active);
        return byIdentity >= 0
          ? byIdentity
          : data.findIndex((d) => d.label === active.label);
      })()
    : -1;
  useEffect(() => {
    onFocus(index >= 0 ? index : null);
  }, [index, onFocus]);
  return null;
}

export function BarChartView({ payload }: { payload: BarChartPayload }) {
  const tokens = useTheme();
  const [focused, setFocused] = useState<number | null>(null);
  const [muted, setMuted] = useState<ReadonlySet<number>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);
  // Defaults mirror the render_bar_chart handler, for the tile path where no
  // handler ran. See the note atop shared/payloads.ts.
  const { title, data, orientation = "vertical", xlabel, ylabel } = payload;
  const isHorizontal = orientation === "horizontal";

  const copyCsv = () =>
    copyText(
      toCsv(
        [xlabel ?? "label", ylabel ?? "value"],
        data.map((d) => [d.label, d.value]),
      ),
    );

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "bar-chart", tokens.surfaces.bg);
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

  const {
    total,
    maxValue,
    pillMode,
    hasMixedSign,
    needsRotation,
    horizontalYAxisWidth,
    endLabelMargin,
  } = useMemo(() => {
    const max = data.reduce((m, d) => Math.max(m, d.value), 0);
    const anyNegative = data.some((d) => d.value < 0);
    const anyPositive = data.some((d) => d.value > 0);
    const longestLabel = data.reduce((m, d) => Math.max(m, d.label.length), 0);
    const longestValue = data.reduce(
      (m, d) => Math.max(m, fmtNumber(d.value).length),
      0,
    );
    return {
      total: data.reduce((sum, d) => sum + d.value, 0),
      maxValue: max,
      // Pill mode is the redesign's default look: lane tracks, fully rounded
      // bars, values at bar ends, no numeric axis. Mixed/negative data falls
      // back to a numeric axis + zero line, where lanes would mislead.
      pillMode: !anyNegative && max > 0,
      hasMixedSign: anyNegative && anyPositive,
      needsRotation:
        !isHorizontal &&
        (data.length > ROTATE_AFTER_ITEMS || longestLabel > ROTATE_AFTER_LABEL_LEN),
      horizontalYAxisWidth: Math.max(
        56,
        Math.min(28 + Math.min(longestLabel, HORIZONTAL_LABEL_MAX) * 7.5, 176),
      ),
      endLabelMargin: Math.max(40, Math.min(longestValue * 7.8 + 12, 96)),
    };
  }, [data, isHorizontal]);

  if (data.length === 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

  const shareable = pillMode && total > 0;

  const chartHeight = isHorizontal
    ? Math.max(220, Math.min(data.length * ROW_HEIGHT + 16, 560))
    : 360;

  const compactEndLabels =
    !isHorizontal &&
    (data.length > VERTICAL_COMPACT_AFTER_ITEMS ||
      maxValue >= VERTICAL_COMPACT_AFTER_MAX);
  const endLabelText = (v: number) =>
    compactEndLabels ? fmtCompact(v) : fmtNumber(v);

  const dense = !isHorizontal && data.length > DENSE_AFTER_ITEMS;
  const showValueLabels =
    pillMode && (isHorizontal || data.length <= VALUE_LABELS_MAX_ITEMS);
  const staggerValueLabels = dense && showValueLabels;
  // Cap visible category ticks; hidden bars stay reachable via tooltip/legend.
  const categoryInterval =
    !isHorizontal && data.length > MAX_VISIBLE_CATEGORY_TICKS
      ? Math.ceil(data.length / MAX_VISIBLE_CATEGORY_TICKS) - 1
      : 0;

  const tickStyle = tickTextStyle(tokens);
  const categoryStyle = categoryTextStyle(tokens);
  const valueAxisLabel = (isHorizontal ? xlabel : ylabel) ?? "value";
  const caption = [xlabel, ylabel].filter(Boolean).join(" · ");

  const endLabelStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: isHorizontal ? 13 : 12,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums" as const,
    fill: tokens.texts.primary,
  };

  // Dense vertical charts: alternate labels between two rows so neighbours
  // with similar heights don't run together ("2.7K2.6K").
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderStaggeredLabel = (props: any) => {
    const { x, y, width, index, value } = props as {
      x?: number | string;
      y?: number | string;
      width?: number | string;
      index?: number;
      value?: number | string;
    };
    if (value == null || x == null || y == null) return null;
    const cx = Number(x) + Number(width ?? 0) / 2;
    const lift = (index ?? 0) % 2 === 1 ? STAGGER_LIFT : 0;
    return (
      <text
        x={cx}
        y={Number(y) - 8 - lift}
        textAnchor="middle"
        style={endLabelStyle}
      >
        {endLabelText(Number(value))}
      </text>
    );
  };

  const legendItems = data.map((d, i) => ({
    name: d.label,
    color: colorFor(d, i, tokens),
    value: fmtNumber(d.value),
    suffix: shareable ? fmtShare(d.value / total) : undefined,
    meter: maxValue > 0 ? (Math.max(0, d.value) / maxValue) * 100 : 0,
  }));

  // Lane tracks are a horizontal-bars device (per the design comp); as
  // full-height columns behind vertical bars they overwhelm the plot.
  const lane =
    pillMode && isHorizontal
      ? { fill: tokens.surfaces.surfaceSunken, radius: BAR_RADIUS }
      : undefined;

  return (
    <div className="sigil-root">
      <ChartHeader
        title={title}
        kpi={{ value: fmtCompact(total), caption: "total" }}
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
              <BarChart
                data={data}
                layout={isHorizontal ? "vertical" : "horizontal"}
                margin={{
                  // Vertical pill mode needs headroom for on-top value labels
                  // (two rows of it when they stagger), and (with the numeric
                  // axis hidden) left room for rotated category labels that
                  // would otherwise clip at the edge.
                  top: !isHorizontal && pillMode ? (staggerValueLabels ? 38 : 24) : 8,
                  right: isHorizontal && pillMode ? endLabelMargin : 16,
                  bottom: 8,
                  left: !isHorizontal && pillMode && needsRotation ? 28 : 8,
                }}
                barCategoryGap="24%"
              >
                <ActiveBandBridge data={data} onFocus={setFocused} />
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
                      hide={pillMode}
                      domain={pillMode ? [0, "dataMax"] : undefined}
                      tick={tickStyle}
                      axisLine={false}
                      tickLine={false}
                      height={30}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={horizontalYAxisWidth}
                      tick={categoryStyle}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) =>
                        truncateLabel(v, HORIZONTAL_LABEL_MAX)
                      }
                      interval={0}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      type="category"
                      dataKey="label"
                      tick={dense ? { ...categoryStyle, fontSize: 12 } : categoryStyle}
                      axisLine={false}
                      tickLine={false}
                      interval={categoryInterval}
                      tickFormatter={(v: string) =>
                        truncateLabel(
                          v,
                          dense
                            ? VERTICAL_LABEL_MAX_DENSE
                            : needsRotation
                              ? VERTICAL_LABEL_MAX_ROTATED
                              : VERTICAL_LABEL_MAX_STRAIGHT,
                        )
                      }
                      height={needsRotation ? (dense ? 74 : 88) : 34}
                      angle={needsRotation ? (dense ? -45 : -35) : 0}
                      textAnchor={needsRotation ? "end" : "middle"}
                    />
                    <YAxis
                      type="number"
                      hide={pillMode}
                      domain={pillMode ? [0, "dataMax"] : undefined}
                      tick={tickStyle}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                  </>
                )}
                {hasMixedSign && (
                  <ReferenceLine
                    {...(isHorizontal ? { x: 0 } : { y: 0 })}
                    stroke={tokens.chartLines.axis}
                    strokeWidth={1.5}
                  />
                )}
                <Tooltip
                  cursor={false}
                  content={(props) => {
                    const datum = props.payload?.[0]?.payload as
                      | BarDatum
                      | undefined;
                    if (!datum) {
                      return <SigilTooltip active={false} />;
                    }
                    const index = data.findIndex((d) => d === datum);
                    const color = colorFor(datum, Math.max(0, index), tokens);
                    const rows = [
                      {
                        color,
                        name: valueAxisLabel,
                        value: fmtNumber(datum.value),
                      },
                      ...(shareable
                        ? [
                            {
                              color,
                              name: "share",
                              value: fmtShare(datum.value / total),
                            },
                          ]
                        : []),
                    ];
                    return (
                      <SigilTooltip
                        active={props.active}
                        label={datum.label}
                        payload={rows}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={BAR_RADIUS}
                  maxBarSize={BAR_SIZE}
                  minPointSize={3}
                  background={lane}
                  isAnimationActive={false}
                  onClick={(_, i) => toggleMute(i)}
                  // Recharts 3 deprecates <Cell>; per-bar fill/opacity render
                  // through a custom shape instead.
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={(props: any) => {
                    const i: number =
                      typeof props.index === "number"
                        ? props.index
                        : data.findIndex((d) => d === props.payload);
                    const datum = data[i] ?? (props.payload as BarDatum);
                    return (
                      <Rectangle
                        {...props}
                        fill={colorFor(datum, Math.max(0, i), tokens)}
                        fillOpacity={opacityFor(Math.max(0, i))}
                      />
                    );
                  }}
                >
                  {showValueLabels &&
                    (staggerValueLabels ? (
                      <LabelList dataKey="value" content={renderStaggeredLabel} />
                    ) : (
                      <LabelList
                        dataKey="value"
                        position={isHorizontal ? "right" : "top"}
                        offset={isHorizontal ? 10 : 8}
                        formatter={(v: unknown) => endLabelText(Number(v))}
                        style={endLabelStyle}
                      />
                    ))}
                </Bar>
              </BarChart>
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
