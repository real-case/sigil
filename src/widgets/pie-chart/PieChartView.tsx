import { useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PieChartPayload } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { ValueLegend } from "../shared/ValueLegend.js";
import { EmptyState } from "../shared/EmptyState.js";
import { fmtNumber, fmtCompact, fmtShare } from "../shared/chart-text.js";
import { toCsv, copyText, copySvgAsPng } from "../shared/export-utils.js";

const MUTED_OPACITY = 0.18;
const UNFOCUSED_OPACITY = 0.32;
// Fat ring per the redesign: inner/outer ≈ 0.67 leaves room for the center KPI.
const OUTER_RADIUS = "80%";
const DONUT_INNER_RADIUS = "54%";
const ACTIVE_GROW = 3;
const CENTER_NAME_MAX = 18;

// Beyond the curated 10-colour palette, keep slices distinguishable: each
// successive wrap of the palette shifts the base hue toward white/black in
// alternating steps, so slice 11 no longer collides with slice 1. Cycle 0 is
// the untouched palette colour, so charts with ≤10 slices are unaffected.
const PALETTE_CYCLE_SHIFTS = [
  null,
  { mix: "white", pct: 30 },
  { mix: "black", pct: 26 },
  { mix: "white", pct: 55 },
  { mix: "black", pct: 48 },
] as const;

function colorFor(
  datum: { color?: string },
  index: number,
  tokens: ChartDesignTokens,
): string {
  if (datum.color) return datum.color;
  const palette = tokens.series;
  const base = palette[index % palette.length]!;
  const cycle = Math.floor(index / palette.length);
  const shift = PALETTE_CYCLE_SHIFTS[cycle % PALETTE_CYCLE_SHIFTS.length];
  return shift ? `color-mix(in oklab, ${base}, ${shift.mix} ${shift.pct}%)` : base;
}

const truncate = (s: string, max: number): string =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`;

export function PieChartView({ payload }: { payload: PieChartPayload }) {
  const tokens = useTheme();
  const [focused, setFocused] = useState<number | null>(null);
  const [muted, setMuted] = useState<ReadonlySet<number>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, data, variant } = payload;

  if (data.length === 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="Nothing to display" description="All slice values are zero." />
      </div>
    );
  }

  const copyCsv = () =>
    copyText(
      toCsv(
        ["label", "value", "percent"],
        data.map((d) => [d.label, d.value, ((d.value / total) * 100).toFixed(2)]),
      ),
    );

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "pie-chart", tokens.surfaces.bg);
  };

  const isDonut = variant === "donut";

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

  const maxValue = data.reduce((m, d) => Math.max(m, d.value), 0);
  const dominantIndex = data.reduce(
    (best, d, i) => (d.value > data[best]!.value ? i : best),
    0,
  );
  const dominant = data[dominantIndex]!;

  const legendItems = data.map((d, i) => ({
    name: d.label,
    color: colorFor(d, i, tokens),
    value: fmtNumber(d.value),
    suffix: fmtShare(d.value / total),
    meter: maxValue > 0 ? (Math.max(0, d.value) / maxValue) * 100 : 0,
  }));

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
            <ResponsiveContainer width="100%" height={340}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={OUTER_RADIUS}
                  innerRadius={isDonut ? DONUT_INNER_RADIUS : 0}
                  paddingAngle={isDonut ? 1 : 0}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                  label={false}
                  labelLine={false}
                  stroke={isDonut ? "none" : tokens.surfaces.bg}
                  strokeWidth={isDonut ? 0 : 2}
                  activeIndex={focused ?? undefined}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  activeShape={(p: any) => (
                    <Sector
                      {...p}
                      innerRadius={
                        isDonut
                          ? Math.max(0, (p.innerRadius ?? 0) - ACTIVE_GROW)
                          : 0
                      }
                      outerRadius={(p.outerRadius ?? 0) + ACTIVE_GROW}
                    />
                  )}
                  onMouseEnter={(_, i) => setFocused(i)}
                  onMouseLeave={() => setFocused(null)}
                >
                  {data.map((datum, i) => (
                    <Cell
                      key={datum.label}
                      fill={colorFor(datum, i, tokens)}
                      fillOpacity={opacityFor(i)}
                      onClick={() => toggleMute(i)}
                      style={{
                        cursor: "pointer",
                        transition:
                          "fill-opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
                      }}
                    />
                  ))}
                </Pie>
                {isDonut && (
                  <>
                    <text
                      x="50%"
                      y="50%"
                      dy={-2}
                      textAnchor="middle"
                      fill={tokens.texts.primary}
                      style={{
                        fontFamily: tokens.typography.family.mono,
                        fontSize: 38,
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtShare(dominant.value / total)}
                    </text>
                    <text
                      x="50%"
                      y="50%"
                      dy={24}
                      textAnchor="middle"
                      fill={tokens.texts.muted}
                      style={{
                        fontFamily: tokens.typography.family.mono,
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {truncate(dominant.label, CENTER_NAME_MAX)}
                    </text>
                  </>
                )}
                <Tooltip
                  content={(props) => {
                    const entry = props.payload?.[0];
                    const name =
                      typeof entry?.name === "string" ? entry.name : undefined;
                    const index = data.findIndex((d) => d.label === name);
                    if (!entry || index === -1) {
                      return <SigilTooltip active={false} />;
                    }
                    const datum = data[index]!;
                    const color = colorFor(datum, index, tokens);
                    return (
                      <SigilTooltip
                        active={props.active}
                        label={datum.label}
                        payload={[
                          { color, name: "value", value: fmtNumber(datum.value) },
                          {
                            color,
                            name: "share",
                            value: fmtShare(datum.value / total),
                          },
                        ]}
                      />
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
