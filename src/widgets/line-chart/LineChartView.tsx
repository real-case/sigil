import { useId, useMemo, useRef, type Key, type ReactElement } from "react";
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
import { seriesEndIndices, dotRole } from "./end-indices.js";
import {
  compareDelta,
  fmtDelta,
  fmtDeltaPct,
  isAllNumeric,
  mergeSeries,
  partialStartIndex,
  splitPartial,
  valueAt,
  type LineRow,
} from "./line-layout.js";
import { useTheme, seriesColor } from "../shared/theme.js";
import { useMediaQuery } from "../shared/use-media-query.js";
import { niceStep } from "../distribution/distribution-math.js";
import { DashGlyph, lineDash } from "../shared/secondary-encoding.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip, type TooltipRow } from "../shared/SigilTooltip.js";
import { ValueLegend } from "../shared/ValueLegend.js";
import { EmptyState } from "../shared/EmptyState.js";
import { annotationMarks, referenceHeadroom, referenceMarks } from "../shared/ReferenceLayer.js";
import {
  tickTextStyle,
  axisCapTextStyle,
  fmtCompact,
  fmtNumber,
  fmtStat,
} from "../shared/chart-text.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";
import { useLegendState } from "../shared/legend-state.js";
import { useMarkMenu } from "../shared/MarkMenu.js";
import { ActiveDatumProbe, useChartKeyActivation, type ActiveDatum } from "../shared/chart-activation.js";

const STROKE_WIDTH = 2.4;
const AREA_TOP_OPACITY = 0.18;
// Gradient fills read cleanly for a couple of series; beyond that the
// overlapping washes muddy the plot, so fall back to bare lines.
const AREA_FILL_MAX_SERIES = 3;
// Below this many points per series, draw point markers: a dense line reads
// cleanly without them, but a sparse series (especially a single point, which
// forms no line segment at all) would otherwise render invisibly.
const SPARSE_DOT_THRESHOLD = 12;
// The comparison baseline is context: quieter than its series, drawn in its
// series' colour (so it never takes a palette slot), and never dotted.
const GHOST_OPACITY = 0.5;
const GHOST_STROKE_WIDTH = 1.6;
const GHOST_DASH = "5 4";
// The incomplete-period tail: the series' own colour and weight, dashed.
const PARTIAL_DASH = "3 4";
const PARTIAL_FILL_FACTOR = 0.45;
// Small multiples: each panel is short, and panels wrap at this width.
const FACET_HEIGHT = 150;
const FACET_MIN_WIDTH = 240;

interface SeriesStats {
  avg: number;
  min: number;
  max: number;
}

const compareLabel = (s: LineSeries) => s.compare?.label ?? "Previous";

export function LineChartView({ payload }: { payload: LineChartPayload }) {
  const tokens = useTheme();
  // Windows High Contrast paints every line in one system colour; dashes keep
  // the series apart (WCAG 1.4.1).
  const forcedColors = useMediaQuery("(forced-colors: active)");
  const { focused, muted, setFocused, toggleMute, opacityFor } =
    useLegendState({ unfocusedOpacity: 0.2 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const probe = useRef<ActiveDatum | null>(null);
  const menu = useMarkMenu(payload.title, payload.followUps);
  // Set below, after the early return; the key handler reads it at key time.
  const openRowRef = useRef<((datum: unknown, at: { x: number; y: number }) => void) | null>(null);
  useChartKeyActivation(canvasRef, probe, menu.open && ((d, at) => openRowRef.current?.(d, at)));
  const gradientUid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { title, series, xlabel, ylabel, reference, annotations, partialFrom } = payload;

  const totalPoints = useMemo(
    () => series.reduce((n, s) => n + s.data.length, 0),
    [series],
  );
  const rows = useMemo(() => mergeSeries(series), [series]);
  const numericX = useMemo(() => isAllNumeric(series), [series]);
  const partialStart = useMemo(
    () => partialStartIndex(rows, partialFrom, numericX),
    [rows, partialFrom, numericX],
  );
  // What Recharts plots: the same rows with the incomplete tail moved aside.
  const plotRows = useMemo(
    () => splitPartial(rows, series.map((s) => s.name), partialStart),
    [rows, series, partialStart],
  );

  // First/last merged-row index at which each series has a value → the
  // start-cap / end-cap anchors. Taken before the split, so the end cap stays
  // on the series' real last point even when that point is incomplete.
  const endIndices = useMemo(
    () => seriesEndIndices(rows, series.map((s) => s.name)),
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

  const compared = series.filter((s) => s.compare);

  const copyCsv = () => {
    const header = [
      xlabel ?? "x",
      ...series.map((s) => s.name),
      ...compared.map((s) => `${s.name} (${compareLabel(s)})`),
    ];
    const body: CsvCell[][] = rows.map((row) => [
      row.x as CsvCell,
      ...series.map((s) => (row[s.name] as CsvCell) ?? ""),
      ...compared.map((s) => row.__cmp?.[s.name] ?? ""),
    ]);
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "line-chart", tokens.surfaces.bg);
  };

  // Legend range positions, relative to the plotted floor (0 for all-positive
  // data, dataMin otherwise) → max across every series.
  const globalMin = Math.min(...stats.map((s) => s.min));
  const globalMax = Math.max(...stats.map((s) => s.max));
  const floor = Math.min(0, globalMin);
  const span = globalMax - floor;
  const pos = (v: number) => (span > 0 ? ((v - floor) / span) * 100 : 50);

  const tickStyle = tickTextStyle(tokens);
  const capStyle = axisCapTextStyle(tokens);

  // Dash patterns as a second channel: on request (`patterns`, a series'
  // `dash`), and always under forced colours (WCAG 1.4.1).
  const autoDash = payload.patterns === true || forcedColors;
  const dashOf = (i: number) => lineDash(i, series[i]?.dash, autoDash);
  const encodesDash = autoDash || series.some((s) => s.dash !== undefined);
  const faceted = payload.facet === true && series.length > 1;

  const legendItems = series.map((s, i) => ({
    name: s.name,
    color: seriesColor(tokens, i),
    glyph: encodesDash ? <DashGlyph dash={dashOf(i)} color={seriesColor(tokens, i)} /> : undefined,
    value: fmtStat(stats[i]!.avg),
    suffix: "avg",
    range: {
      lo: pos(stats[i]!.min),
      hi: pos(stats[i]!.max),
      avg: pos(stats[i]!.avg),
    },
  }));

  const primaryStats = stats[0]!;
  const primary = series[0]!;
  // With a baseline on the primary series, the header answers "compared with
  // what": the change in average over the x values both lines share.
  const primaryDelta = (() => {
    if (!primary.compare) return "";
    let cur = 0;
    let base = 0;
    let n = 0;
    for (const row of rows) {
      const v = row[primary.name];
      const b = row.__cmp?.[primary.name];
      if (typeof v === "number" && b !== undefined) {
        cur += v;
        base += b;
        n += 1;
      }
    }
    if (n === 0) return "";
    const pct = fmtDeltaPct(compareDelta(cur / n, base / n));
    return pct ? ` · ${pct} vs ${compareLabel(primary)}` : "";
  })();

  const tooltipRows = (row: LineRow): TooltipRow[] => {
    const out: TooltipRow[] = [];
    series.forEach((s, i) => {
      if (muted.has(i)) return;
      const color = seriesColor(tokens, i);
      const v = valueAt(row, s.name);
      if (v !== undefined) {
        out.push({ color, name: s.name, dataKey: `${i}:value`, value: fmtNumber(v) });
      }
      const b = row.__cmp?.[s.name];
      if (b === undefined) return;
      out.push({ color, name: compareLabel(s), dataKey: `${i}:base`, value: fmtNumber(b) });
      if (v !== undefined) {
        out.push({
          color,
          name: `Change vs ${compareLabel(s)}`,
          dataKey: `${i}:delta`,
          value: fmtDelta(compareDelta(v, b)),
        });
      }
    });
    return out;
  };

  const detail = [
    `${countOf(series.length, "series", "series")} over ${countOf(rows.length, "point")}`,
    ...(compared.length > 0
      ? [`compared with ${compared.map(compareLabel).filter((l, i, a) => a.indexOf(l) === i).join(", ")}`]
      : []),
  ].join(", ");

  /** The dot renderer for one series, limited to rows `from`..`to`. */
  const dotsFor = (i: number, color: string, from: number, to: number) => {
    const s = series[i]!;
    const sparse = s.data.length <= SPARSE_DOT_THRESHOLD;
    const { first, last } = endIndices[i]!;
    const opacity = opacityFor(i);
    return (dotProps: { key?: Key | null; index?: number; cx?: number; cy?: number }) => {
      // Recharts passes `value` as a [baseValue, rawValue] tuple for a
      // non-stacked Area — never nullish, so gap rows are caught by the cy
      // check alone.
      const { key, index, cx, cy } = dotProps;
      const dotKey = key ?? `${s.name}-dot-${index}`;
      const idx = index ?? -1;
      if (cx == null || cy == null || Number.isNaN(cx) || Number.isNaN(cy) || idx < from || idx > to) {
        return <g key={dotKey} />;
      }
      const role = dotRole({ index: idx, first, last, sparse });
      if (role === "none") return <g key={dotKey} />;
      const isEnd = role === "end";
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
            transition: "opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
          }}
        />
      );
    };
  };

  const opacityTransition = {
    transition:
      "stroke-opacity var(--sigil-duration-base) var(--sigil-easing-standard), fill-opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
  };

  // Drill-down on a line chart is per x value: a click anywhere on the plot,
  // or Enter on the focused chart, asks about the point the tooltip is on.
  const openRow = menu.open
    ? (datum: unknown, at: { x: number; y: number }) => {
        const row = datum as LineRow;
        const values = series.flatMap((s, i) => {
          const v = muted.has(i) ? undefined : valueAt(row, s.name);
          return v === undefined ? [] : [series.length > 1 ? `${s.name} ${fmtNumber(v)}` : fmtNumber(v)];
        });
        menu.open?.(
          {
            label: xlabel !== undefined ? `${xlabel} ${String(row.x)}` : String(row.x),
            value: values.length > 0 ? values.join("; ") : undefined,
          },
          at,
        );
      }
    : null;
  openRowRef.current = openRow;

  const lastRow = rows.length - 1;
  const showFill = faceted || series.length <= AREA_FILL_MAX_SERIES;

  // Baselines first, so every series draws over its own ghost.
  const ghostFor = (i: number): ReactElement[] => {
    const s = series[i]!;
    return s.compare
      ? [
          <Area
            key={`${s.name}-baseline`}
            type="monotone"
            name={compareLabel(s)}
            dataKey={(row: LineRow) => row.__cmp?.[s.name]}
            stroke={seriesColor(tokens, i)}
            strokeWidth={GHOST_STROKE_WIDTH}
            strokeDasharray={GHOST_DASH}
            strokeLinecap="round"
            strokeOpacity={muted.has(i) ? 0 : GHOST_OPACITY * opacityFor(i)}
            fill="transparent"
            fillOpacity={0}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            style={opacityTransition}
            connectNulls
          />,
        ]
      : [];
  };
  const ghosts: ReactElement[] = series.flatMap((_, i) => ghostFor(i));

  const linesFor = (i: number): ReactElement[] => {
    const s = series[i]!;
    const color = seriesColor(tokens, i);
    const isMuted = muted.has(i);
    const opacity = opacityFor(i);
    const solidTo = partialStart >= 0 ? partialStart - 1 : lastRow;
    const activeDot = isMuted
      ? false
      : { r: 4.5, fill: color, strokeWidth: 2, stroke: tokens.surfaces.surface };
    const solid = (
      <Area
        key={s.name}
        type="monotone"
        dataKey={s.name}
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={dashOf(i)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={opacity}
        fill={showFill ? `url(#${gradientUid}-${i})` : "transparent"}
        fillOpacity={showFill ? opacity : 0}
        dot={dotsFor(i, color, 0, solidTo)}
        activeDot={activeDot}
        isAnimationActive={false}
        style={opacityTransition}
        connectNulls
      />
    );
    if (partialStart < 0) return [solid];
    return [
      solid,
      <Area
        key={`${s.name}-incomplete`}
        type="monotone"
        name={`${s.name} (incomplete)`}
        dataKey={(row: LineRow) => row.__part?.[s.name]}
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={PARTIAL_DASH}
        strokeLinecap="round"
        strokeOpacity={opacity}
        fill={showFill ? `url(#${gradientUid}-${i})` : "transparent"}
        fillOpacity={showFill ? opacity * PARTIAL_FILL_FACTOR : 0}
        dot={dotsFor(i, color, partialStart, lastRow)}
        activeDot={activeDot}
        isAnimationActive={false}
        style={opacityTransition}
        connectNulls
      />,
    ];
  };
  const lines: ReactElement[] = series.flatMap((_, i) => linesFor(i));

  const gradientDefs = (only?: number) => (
    <defs>
      {series.map((s, i) => {
        if (only !== undefined && i !== only) return null;
        const color = seriesColor(tokens, i);
        return (
          <linearGradient key={s.name} id={`${gradientUid}-${i}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={AREA_TOP_OPACITY} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        );
      })}
    </defs>
  );

  if (faceted) {
    // Small multiples (plan task 4.8): one panel per series, every panel on the
    // same x values and the same y range, so a taller line is a larger number.
    let lo = Math.min(0, globalMin);
    let hi = globalMax;
    for (const row of rows) {
      for (const v of Object.values(row.__cmp ?? {})) {
        if (typeof v === "number") {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    }
    for (const r of reference ?? []) {
      if (r.axis !== "y") continue;
      for (const v of [r.value, r.from, r.to]) {
        if (typeof v === "number") {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    }
    if (!(hi > lo)) hi = lo + 1;
    // Round the shared range out to whole steps, so every panel carries the
    // same three short, readable ticks.
    const step = niceStep((hi - lo) / 3);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    const domain: [number, number] = [lo, hi];
    const yTicks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, k) => Number((lo + k * step).toPrecision(12)));
    return (
      <div className="sigil-root">
        <ChartHeader
          title={title}
          kpi={{ value: String(series.length), caption: `series · ${countOf(rows.length, "point")} each` }}
        >
          <Toolbar>
            <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          </Toolbar>
        </ChartHeader>
        <div
          className="sigil-canvas sigil-facets"
          ref={canvasRef}
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${FACET_MIN_WIDTH}px, 100%), 1fr))` }}
        >
          {series.map((s, i) => {
            const color = seriesColor(tokens, i);
            return (
              <figure key={s.name} className="sigil-facet">
                <figcaption className="sigil-facet-head">
                  <i style={{ background: color }} aria-hidden="true" />
                  <span className="sigil-facet-name">{s.name}</span>
                  <span className="sigil-facet-val">{fmtStat(stats[i]!.avg)} avg</span>
                </figcaption>
                <ResponsiveContainer width="100%" height={FACET_HEIGHT}>
                  <AreaChart
                    aria-label={chartLabel(`${title}: ${s.name}`, "line chart", `${countOf(s.data.length, "point")}, same scale as the other panels`)}
                    data={plotRows}
                    style={openRow ? { cursor: "pointer" } : undefined}
                    onClick={
                      openRow
                        ? (_state, e) => {
                            const active = probe.current;
                            const { clientX, clientY } = e as unknown as MouseEvent;
                            if (active) openRow(active.datum, { x: clientX, y: clientY });
                          }
                        : undefined
                    }
                    margin={{ top: 8, right: 10, bottom: 0, left: 0 }}
                  >
                    {gradientDefs(i)}
                    <CartesianGrid stroke={tokens.chartLines.grid} horizontal vertical={false} />
                    <XAxis
                      dataKey="x"
                      type={numericX ? "number" : "category"}
                      domain={numericX ? ["dataMin", "dataMax"] : undefined}
                      tick={tickStyle}
                      axisLine={{ stroke: tokens.chartLines.axis }}
                      tickLine={false}
                      height={24}
                      minTickGap={24}
                    />
                    <YAxis domain={domain} ticks={yTicks} tickFormatter={(v: number) => fmtCompact(v)} tick={tickStyle} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      cursor={{ stroke: tokens.chartLines.axis, strokeWidth: 1, strokeDasharray: "2 3" }}
                      content={(props) => {
                        const row = props.payload?.[0]?.payload as LineRow | undefined;
                        if (!props.active || !row) return <SigilTooltip active={false} />;
                        const x = xlabel !== undefined ? `${xlabel} ${String(row.x)}` : String(row.x);
                        return (
                          <SigilTooltip
                            active
                            label={x}
                            payload={tooltipRows(row).filter((r) => String(r.dataKey ?? "").startsWith(`${i}:`))}
                          />
                        );
                      }}
                    />
                    {referenceMarks(reference, tokens)}
                    {annotationMarks(annotations, tokens)}
                    {ghostFor(i)}
                    {linesFor(i)}
                    <ActiveDatumProbe into={probe} />
                  </AreaChart>
                </ResponsiveContainer>
              </figure>
            );
          })}
        </div>
        {xlabel && <div className="sigil-caption">{xlabel} · every panel on the same scale</div>}
        {menu.element}
      </div>
    );
  }

  return (
    <div className="sigil-root">
      <ChartHeader
        title={title}
        kpi={{
          value: fmtStat(primaryStats.avg),
          caption: `${primary.name} avg${primaryDelta}`,
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
            aria-label={chartLabel(title, "line chart", detail)}
            data={plotRows}
            style={openRow ? { cursor: "pointer" } : undefined}
            onClick={
              openRow
                ? (_state, e) => {
                    const active = probe.current;
                    const { clientX, clientY } = e as unknown as MouseEvent;
                    if (active) openRow(active.datum, { x: clientX, y: clientY });
                  }
                : undefined
            }
            margin={{
              // Annotation labels sit inside the plot's top edge, two rows deep.
              top: annotations?.length ? 30 : 12 + referenceHeadroom(reference),
              right: 16,
              bottom: 8,
              left: ylabel ? 8 : 0,
            }}
          >
            <defs>
              {series.map((s, i) => {
                const color = seriesColor(tokens, i);
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
              content={(props) => {
                const row = props.payload?.[0]?.payload as LineRow | undefined;
                if (!props.active || !row) return <SigilTooltip active={false} />;
                const incomplete =
                  partialStart >= 0 && plotRows.indexOf(row) >= partialStart;
                const x =
                  xlabel !== undefined ? `${xlabel} ${String(row.x)}` : String(row.x);
                return (
                  <SigilTooltip
                    active
                    label={incomplete ? `${x} · incomplete` : x}
                    payload={tooltipRows(row)}
                  />
                );
              }}
            />
            {referenceMarks(reference, tokens)}
            {annotationMarks(annotations, tokens)}
            {ghosts}
            {lines}
            <ActiveDatumProbe into={probe} />
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
      {menu.element}
    </div>
  );
}
