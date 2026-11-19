import { useMemo, useRef } from "react";
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
} from "recharts";
import type { BarChartPayload, BarDatum } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { EmptyState } from "../shared/EmptyState.js";
import {
  tickTextStyle,
  categoryTextStyle,
  fmtNumber,
  fmtCompact,
} from "../shared/chart-text.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { toCsv, copyText, copySvgAsPng } from "../shared/export-utils.js";
import { referenceHeadroom, referenceMarks } from "../shared/ReferenceLayer.js";
import { useMarkMenu } from "../shared/MarkMenu.js";
import { ActiveDatumProbe, useChartKeyActivation, type ActiveDatum } from "../shared/chart-activation.js";
import { waterfallLayout, waterfallSpan, type WaterfallStep } from "./stack-layout.js";

const BAR_RADIUS = 4;
const MAX_BAR_SIZE = 56;
const ROW_HEIGHT = 44;
const ROTATE_AFTER_ITEMS = 7;
const ROTATE_AFTER_LABEL_LEN = 9;
const LABEL_MAX = 16;

type Tone = "rise" | "fall" | "total";

interface Row {
  label: string;
  span: [number, number];
  step: WaterfallStep;
  tone: Tone;
}

const toneOf = (step: WaterfallStep): Tone =>
  step.kind === "total" ? "total" : step.value < 0 ? "fall" : "rise";

// Rise and fall come from the two arms of the diverging scale — blue and
// orange, which survive red–green colour blindness where green/red would not —
// and the sign is printed on every change, so colour is never the only cue.
// Totals are neutral: they are levels, not movements.
function toneColor(tone: Tone, tokens: ChartDesignTokens): string {
  if (tone === "total") return tokens.texts.secondary;
  const d = tokens.diverging;
  return tone === "rise" ? d[1]! : d[d.length - 2]!;
}

/** Round axis bounds and the ticks between them: ~5 steps of 1, 2, 2.5 or 5 × 10^k. */
function niceAxis(lo: number, hi: number): { domain: [number, number]; ticks: number[] } {
  const range = hi - lo || Math.abs(hi) || 1;
  const raw = range / 5;
  const k = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * k >= raw) ?? 10) * k;
  const from = Math.floor(lo / step) * step;
  const to = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = from; t <= to + step / 2; t += step) ticks.push(Math.round(t / step) * step);
  return { domain: [from, to], ticks };
}

const truncate = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);

/** "+120" / "−40" (true minus) for a change, the plain level for a total. */
export function waterfallText(step: Pick<WaterfallStep, "kind" | "value">, compact = false): string {
  const fmt = compact ? fmtCompact : fmtNumber;
  if (step.kind === "total") return fmt(step.value);
  if (step.value > 0) return `+${fmt(step.value)}`;
  if (step.value < 0) return `−${fmt(-step.value)}`;
  return fmt(0);
}

/**
 * `render_bar_chart` with `variant: "waterfall"`: a bridge from a start value
 * to an end value. The step maths is in stack-layout.ts; this file only
 * draws it — each step a floating range bar, a thin connector at the level
 * the previous step ended on, the signed change above (or beside) the bar.
 */
export function WaterfallView({
  payload,
  data,
}: {
  payload: BarChartPayload;
  data: readonly BarDatum[];
}) {
  const tokens = useTheme();
  const canvasRef = useRef<HTMLDivElement>(null);
  const probe = useRef<ActiveDatum | null>(null);
  const { title, orientation = "vertical", xlabel, ylabel, reference, totalLabel } = payload;
  const isHorizontal = orientation === "horizontal";

  const rows = useMemo<Row[]>(
    () =>
      waterfallLayout(data, totalLabel).map((step) => ({
        label: step.label,
        span: waterfallSpan(step),
        step,
        tone: toneOf(step),
      })),
    [data, totalLabel],
  );

  // Bar geometry by row, filled in as Recharts renders the shapes (in order),
  // so each bar can draw the connector from the one before it.
  const geometry = useRef<{ x: number; y: number; width: number; height: number }[]>([]);

  const menu = useMarkMenu(title, payload.followUps);
  const openRow = menu.open
    ? (i: number, at: { x: number; y: number }) => {
        const row = rows[i];
        if (row) menu.open?.({ label: row.label, value: waterfallText(row.step) }, at);
      }
    : null;
  useChartKeyActivation(
    canvasRef,
    probe,
    openRow &&
      ((datum, at) => {
        const i = rows.indexOf(datum as Row);
        if (i >= 0) openRow(i, at);
      }),
  );

  if (rows.length === 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

  const closing = rows[rows.length - 1]!.step;
  const lo = Math.min(0, ...rows.map((r) => r.span[0]));
  const hi = Math.max(0, ...rows.map((r) => r.span[1]));
  const crossesZero = lo < 0;
  const axis = niceAxis(lo, hi);
  const compact = rows.length > 8 || Math.max(Math.abs(lo), Math.abs(hi)) >= 100_000;
  const longestLabel = rows.reduce((m, r) => Math.max(m, r.label.length), 0);
  const needsRotation =
    !isHorizontal && (rows.length > ROTATE_AFTER_ITEMS || longestLabel > ROTATE_AFTER_LABEL_LEN);
  const chartHeight = isHorizontal
    ? Math.max(220, Math.min(rows.length * ROW_HEIGHT + 40, 600))
    : 360;

  const tickStyle = tickTextStyle(tokens);
  const categoryStyle = categoryTextStyle(tokens);
  const valueLabelStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: 12,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums" as const,
  };
  const caption = [xlabel, ylabel].filter(Boolean).join(" · ");

  const copyCsv = () =>
    copyText(
      toCsv(
        [xlabel ?? "label", "kind", ylabel ?? "value", "running total"],
        rows.map((r) => [r.label, r.step.kind, r.step.value, r.step.end]),
      ),
    );

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "waterfall", tokens.surfaces.bg);
  };

  // Value → pixel along the value axis, read off a bar's own geometry: its two
  // edges are its span's two ends, and the axis is linear.
  const pixelOf = (
    g: { x: number; y: number; width: number; height: number },
    span: [number, number],
    v: number,
  ) => {
    const range = span[1] - span[0];
    if (isHorizontal) return range === 0 ? g.x : g.x + ((v - span[0]) / range) * g.width;
    return range === 0 ? g.y + g.height : g.y + g.height - ((v - span[0]) / range) * g.height;
  };

  const renderLabel = (props: unknown) => {
    const { x, y, width, height, index } = props as {
      x?: number | string;
      y?: number | string;
      width?: number | string;
      height?: number | string;
      index?: number;
    };
    const row = rows[index ?? -1];
    if (!row || x == null || y == null) return null;
    const bx = Number(x);
    const by = Number(y);
    const bw = Number(width ?? 0);
    const bh = Number(height ?? 0);
    const fill = row.tone === "total" ? tokens.texts.primary : toneColor(row.tone, tokens);
    const text = waterfallText(row.step, compact);
    if (isHorizontal) {
      // Past the end the bar moved towards: right of a rise, left of a fall.
      const left = row.tone === "fall" || (row.tone === "total" && row.step.value < 0);
      return (
        <text
          x={left ? bx - 6 : bx + bw + 6}
          y={by + bh / 2}
          textAnchor={left ? "end" : "start"}
          dominantBaseline="central"
          style={{ ...valueLabelStyle, fill }}
        >
          {text}
        </text>
      );
    }
    const below = row.tone === "fall" || (row.tone === "total" && row.step.value < 0);
    return (
      <text
        x={bx + bw / 2}
        y={below ? by + bh + 14 : by - 7}
        textAnchor="middle"
        style={{ ...valueLabelStyle, fill }}
      >
        {text}
      </text>
    );
  };

  return (
    <div className="sigil-root">
      <ChartHeader
        title={title}
        kpi={{ value: fmtCompact(closing.end), caption: closing.label }}
      >
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </ChartHeader>
      <div className="sigil-plot">
        <div className="sigil-canvas" ref={canvasRef}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              aria-label={chartLabel(
                title,
                isHorizontal ? "horizontal waterfall chart" : "waterfall chart",
                `${countOf(rows.filter((r) => r.step.kind === "delta").length, "change")}, ending at ${fmtNumber(closing.end)}`,
              )}
              data={rows}
              layout={isHorizontal ? "vertical" : "horizontal"}
              margin={{
                top: (isHorizontal ? 8 : 24) + referenceHeadroom(reference),
                right: isHorizontal ? 64 : 16,
                bottom: isHorizontal ? 8 : crossesZero ? 20 : 8,
                left: isHorizontal ? (crossesZero ? 56 : 8) : 8,
              }}
              barCategoryGap="22%"
            >
              <ActiveDatumProbe into={probe} />
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
                    domain={axis.domain}
                    ticks={axis.ticks}
                    tick={tickStyle}
                    tickFormatter={(v: number) => fmtCompact(v)}
                    axisLine={false}
                    tickLine={false}
                    height={30}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={Math.max(64, Math.min(24 + Math.min(longestLabel, LABEL_MAX) * 7.5, 176))}
                    tick={categoryStyle}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => truncate(v, LABEL_MAX)}
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
                    tickFormatter={(v: string) => truncate(v, needsRotation ? LABEL_MAX : 12)}
                    height={needsRotation ? 84 : 34}
                    angle={needsRotation ? -35 : 0}
                    textAnchor={needsRotation ? "end" : "middle"}
                  />
                  <YAxis
                    type="number"
                    domain={axis.domain}
                    ticks={axis.ticks}
                    tick={tickStyle}
                    tickFormatter={(v: number) => fmtCompact(v)}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                </>
              )}
              <ReferenceLine
                {...(isHorizontal ? { x: 0 } : { y: 0 })}
                stroke={tokens.chartLines.axis}
                strokeWidth={1}
              />
              {referenceMarks(reference, tokens, { swapped: isHorizontal })}
              <Tooltip
                cursor={{ fill: tokens.surfaces.surfaceSunken, opacity: 0.6 }}
                content={(props) => {
                  const row = props.payload?.[0]?.payload as Row | undefined;
                  if (!row) return <SigilTooltip active={false} />;
                  const color = toneColor(row.tone, tokens);
                  const lines =
                    row.step.kind === "total"
                      ? [{ color, name: row.step.source < 0 ? "closing total" : "total", value: fmtNumber(row.step.value) }]
                      : [
                          { color, name: "change", value: waterfallText(row.step) },
                          { color: tokens.texts.secondary, name: "running total", value: fmtNumber(row.step.end) },
                        ];
                  return <SigilTooltip active={props.active} label={row.label} payload={lines} />;
                }}
              />
              <Bar
                dataKey="span"
                maxBarSize={MAX_BAR_SIZE}
                isAnimationActive={false}
                onClick={
                  openRow ? (_, i, e) => openRow(i, { x: e.clientX, y: e.clientY }) : undefined
                }
                style={openRow ? { cursor: "pointer" } : undefined}
                // Recharts hands the shape its own computed geometry and this
                // spreads it straight back into <Rectangle>.
                // biome-ignore lint/suspicious/noExplicitAny: spread straight back into Recharts' own component
                shape={(props: any) => {
                  const i: number =
                    typeof props.index === "number" ? props.index : rows.indexOf(props.payload as Row);
                  const row = rows[i];
                  if (!row) return <g />;
                  const g = {
                    x: Number(props.x),
                    y: Number(props.y),
                    width: Number(props.width),
                    height: Number(props.height),
                  };
                  geometry.current[i] = g;
                  const prev = i > 0 ? rows[i - 1] : undefined;
                  const prevGeom = i > 0 ? geometry.current[i - 1] : undefined;
                  // A connector says "this step starts where the last one
                  // ended", so it is drawn into every change and into a total
                  // that agrees with the running total — not into a total
                  // that restarts it somewhere else.
                  const joins =
                    prev &&
                    prevGeom &&
                    (row.step.kind === "delta" || Math.abs(row.step.value - prev.step.end) < 1e-9);
                  const level = joins ? pixelOf(g, row.span, prev.step.end) : 0;
                  return (
                    <g>
                      {joins &&
                        (isHorizontal ? (
                          <line
                            x1={level}
                            x2={level}
                            y1={prevGeom.y + prevGeom.height}
                            y2={g.y}
                            stroke={tokens.texts.muted}
                            strokeWidth={1}
                            strokeDasharray="2 2"
                          />
                        ) : (
                          <line
                            x1={prevGeom.x + prevGeom.width}
                            x2={g.x}
                            y1={level}
                            y2={level}
                            stroke={tokens.texts.muted}
                            strokeWidth={1}
                            strokeDasharray="2 2"
                          />
                        ))}
                      <Rectangle
                        {...props}
                        radius={BAR_RADIUS}
                        // A zero change still needs a sliver to be hoverable.
                        {...(isHorizontal
                          ? { width: Math.max(2, g.width) }
                          : g.height < 2
                            ? { height: 2, y: g.y - 1 }
                            : {})}
                        fill={toneColor(row.tone, tokens)}
                      />
                    </g>
                  );
                }}
              >
                <LabelList dataKey="span" content={renderLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="sigil-wf-key" aria-hidden="true">
          {(["rise", "fall", "total"] as const).map((tone) => (
            <span key={tone}>
              <i style={{ background: toneColor(tone, tokens) }} />
              {tone === "rise" ? "Increase" : tone === "fall" ? "Decrease" : "Total"}
            </span>
          ))}
        </div>
        {caption && <div className="sigil-caption">{caption}</div>}
      </div>
      {menu.element}
    </div>
  );
}
