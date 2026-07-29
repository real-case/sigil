import { useEffect, useMemo, useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Sector,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PieChartPayload } from "../../shared/payloads.js";
import {
  collapsePieData,
  normalizeMaxSegments,
  type PieDisplaySlice,
} from "./collapse.js";
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
  // focused/muted key on origIndex into payload.data (-1 = the synthetic
  // Other), so they stay meaningful across collapse/expand.
  const [focused, setFocused] = useState<number | null>(null);
  const [muted, setMuted] = useState<ReadonlySet<number>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, data, variant } = payload;
  // Same clamp the reducer applies, so the "Show top N" label never lies.
  const cap = normalizeMaxSegments(payload.maxSegments);

  // mountWidget and the sandbox render <View> without a key, so per-payload
  // UI state would leak across payload swaps — reset it when the data changes.
  useEffect(() => {
    setExpanded(false);
    setMuted((prev) => (prev.size ? new Set() : prev));
    setFocused(null);
  }, [data]);

  const full = useMemo<PieDisplaySlice[]>(
    () => data.map((d, i) => ({ ...d, origIndex: i })),
    [data],
  );
  const { display, isCollapsed } = useMemo(
    () => collapsePieData(data, cap),
    [data, cap],
  );
  const shown = expanded || !isCollapsed ? full : display;

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

  const toggleMute = (orig: number) =>
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(orig)) next.delete(orig);
      else next.add(orig);
      return next;
    });

  const opacityFor = (orig: number) =>
    muted.has(orig)
      ? MUTED_OPACITY
      : focused !== null && focused !== orig
        ? UNFOCUSED_OPACITY
        : 1;

  // The synthetic Other renders in the neutral muted tone; kept slices take
  // their palette colour from origIndex so hues stay stable across
  // collapse/expand.
  const sliceColor = (s: PieDisplaySlice) =>
    s.isOther ? tokens.texts.muted : colorFor(s, s.origIndex, tokens);

  // Clicking Other expands the collapsed tail instead of muting it.
  const handleSliceAction = (i: number) => {
    const s = shown[i];
    if (!s) return;
    if (s.isOther) {
      setExpanded(true);
      // The hovered Other (origIndex -1) vanishes on expand; a stale focus
      // would dim every slice until the pointer moves.
      setFocused(null);
    } else {
      toggleMute(s.origIndex);
    }
  };

  const focusShown = (i: number | null) =>
    setFocused(i === null ? null : (shown[i]?.origIndex ?? null));

  const maxValue = shown.reduce((m, d) => Math.max(m, d.value), 0);
  const dominant = shown.reduce(
    (best, d) => (d.value > best.value ? d : best),
    shown[0]!,
  );

  const legendItems = shown.map((d) => ({
    name: d.label,
    color: sliceColor(d),
    value: fmtNumber(d.value),
    suffix: fmtShare(d.value / total),
    meter: maxValue > 0 ? (Math.max(0, d.value) / maxValue) * 100 : 0,
  }));
  // ValueLegend consumes display indices — project the origIndex-keyed state.
  const legendMuted = new Set(
    shown.flatMap((s, i) => (muted.has(s.origIndex) ? [i] : [])),
  );
  const legendFocused = (() => {
    if (focused === null) return null;
    const i = shown.findIndex((s) => s.origIndex === focused);
    return i === -1 ? null : i;
  })();

  // Recharts 3 deprecates <Cell>: per-slice fill/opacity ride along on the
  // data entries instead (sectors inherit presentational props from them).
  const pieData = shown.map((d) => ({
    ...d,
    fill: sliceColor(d),
    fillOpacity: opacityFor(d.origIndex),
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
                  data={pieData}
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
                  // Recharts 3.9: one shape renderer for every sector; the
                  // hovered one arrives with isActive and grows a little.
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={(p: any) => {
                    return (
                      <Sector
                        {...p}
                        innerRadius={
                          p.isActive && isDonut
                            ? Math.max(0, (p.innerRadius ?? 0) - ACTIVE_GROW)
                            : p.innerRadius
                        }
                        outerRadius={
                          p.isActive
                            ? (p.outerRadius ?? 0) + ACTIVE_GROW
                            : p.outerRadius
                        }
                      />
                    );
                  }}
                  onMouseEnter={(_, i) => focusShown(i)}
                  onMouseLeave={() => setFocused(null)}
                  onClick={(_, i) => handleSliceAction(i)}
                />
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
                    // Read the hovered datum object itself (BarChartView's
                    // pattern) — label lookup breaks on the synthetic Other
                    // and on user slices that share a label.
                    const entry = props.payload?.[0];
                    const datum = entry?.payload as PieDisplaySlice | undefined;
                    if (!entry || typeof datum?.origIndex !== "number") {
                      return <SigilTooltip active={false} />;
                    }
                    const color = sliceColor(datum);
                    const rows = [
                      { color, name: "value", value: fmtNumber(datum.value) },
                      {
                        color,
                        name: "share",
                        value: fmtShare(datum.value / total),
                      },
                    ];
                    if (datum.isOther) {
                      rows.push({
                        color: tokens.texts.muted,
                        name: "categories",
                        value: String(datum.otherCount ?? 0),
                      });
                      rows.push({
                        color: tokens.texts.muted,
                        name: "click to expand",
                        value: "",
                      });
                    }
                    return (
                      <SigilTooltip
                        active={props.active}
                        label={datum.label}
                        payload={rows}
                      />
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {expanded && isCollapsed && (
            <button
              type="button"
              className="sigil-toolbar-btn"
              style={{ marginTop: tokens.spacing.sm }}
              onClick={() => {
                setExpanded(false);
                // A focus pointing into the collapsed tail would dim the
                // whole chart — same hazard as on expand.
                setFocused(null);
              }}
            >
              Show top {cap}
            </button>
          )}
        </div>
        <ValueLegend
          items={legendItems}
          focused={legendFocused}
          muted={legendMuted}
          onFocus={focusShown}
          onToggleMute={handleSliceAction}
        />
      </div>
    </div>
  );
}
