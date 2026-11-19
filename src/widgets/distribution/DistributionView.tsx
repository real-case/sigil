// render_distribution: histogram and box plot (plan task 4.4, program item 14).
//
// Hand-rolled SVG in the heatmap / funnel tradition — Recharts has no box plot,
// and a histogram needs touching bars on a numeric axis with shared bucket
// edges, which a category BarChart cannot promise.
//
// - One hue. Groups are told apart by their labelled rows, so a colour per
//   group would only repeat the label; colour is left free for the markers.
// - Every group shares the value axis, and in a histogram the count axis too,
//   so a taller bar or a wider box really is larger.
// - A box plot is explained in words under the chart: not every reader knows
//   what the box and the whiskers stand for.

import { useEffect, useMemo, useRef, useState } from "react";
import type { DistributionPayload } from "../../shared/payloads.js";
import { useTheme } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip, type TooltipRow } from "../shared/SigilTooltip.js";
import { EmptyState } from "../shared/EmptyState.js";
import { fmtCompact, fmtNumber, fmtStat } from "../shared/chart-text.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { useRovingFocus } from "../shared/roving-focus.js";
import { useMarkMenu } from "../shared/MarkMenu.js";
import { referenceToneColors, REFERENCE_DASH } from "../shared/reference-layer.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";
import { groupBox, histogramLayout, linearTicks, type BoxStats } from "./distribution-math.js";

const LABEL_MAX_CHARS = 22;
const LABEL_CHAR_PX = 7;
const LABEL_MIN = 64;
const LABEL_MAX = 170;
const AXIS_HEIGHT = 40;
const MARKER_HEADROOM = 18;
const RIGHT_PAD = 16;
const SINGLE_HIST_HEIGHT = 220;
const MULTI_HIST_HEIGHT = 84;
const HIST_GAP = 10;
const BOX_ROW = 40;
const BOX_THICKNESS = 18;
const UNSELECTED_OPACITY = 0.35;

const truncate = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);

function useContainerWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** One focusable mark: a histogram bucket or a whole box. */
interface Mark {
  group: number;
  /** Bucket index within the group (histogram only). */
  bin?: number;
}

interface TooltipState {
  mark: number;
  x: number;
  y: number;
}

export function DistributionView({ payload }: { payload: DistributionPayload }) {
  const tokens = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const [selected, setSelected] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { title, groups, valueLabel, markers } = payload;
  const isBox = payload.variant === "box";
  const menu = useMarkMenu(title, payload.followUps);

  const hist = useMemo(
    () => (isBox ? null : histogramLayout(groups, payload.binCount)),
    [isBox, groups, payload.binCount],
  );
  const boxes = useMemo(() => (isBox ? groups.map(groupBox) : []), [isBox, groups]);

  const marks: Mark[] = useMemo(() => {
    if (hist) return hist.groups.flatMap((g, gi) => g.bins.map((_, bi) => ({ group: gi, bin: bi })));
    return boxes.flatMap((b, gi) => (b ? [{ group: gi }] : []));
  }, [hist, boxes]);

  const unit = valueLabel ? ` · ${valueLabel}` : "";

  const describe = (m: Mark): { label: string; value: string; rows: TooltipRow[] } => {
    const name = groups[m.group]?.name ?? "";
    const color = tokens.series[0]!;
    if (hist && m.bin !== undefined) {
      const g = hist.groups[m.group]!;
      const b = g.bins[m.bin]!;
      const share = g.total > 0 ? b.count / g.total : 0;
      const range = `${fmtStat(b.start)}–${fmtStat(b.end)}`;
      return {
        label: `${groups.length > 1 ? `${name}, ` : ""}${range}`,
        value: `${fmtNumber(b.count)} (${(share * 100).toFixed(1)}%)`,
        rows: [
          { color, name: "count", value: fmtNumber(b.count) },
          { color, name: "share", value: `${(share * 100).toFixed(1)}%` },
        ],
      };
    }
    const s = boxes[m.group]!;
    const rows: TooltipRow[] = [
      { color: tokens.texts.muted, name: "max (whisker)", value: fmtStat(s.max) },
      { color, name: "75th percentile", value: fmtStat(s.q3) },
      { color, name: "median", value: fmtStat(s.median) },
      { color, name: "25th percentile", value: fmtStat(s.q1) },
      { color: tokens.texts.muted, name: "min (whisker)", value: fmtStat(s.min) },
    ];
    if (s.mean !== undefined) rows.push({ color: tokens.texts.muted, name: "mean", value: fmtStat(s.mean) });
    if (s.count !== undefined) rows.push({ color: tokens.texts.muted, name: "observations", value: fmtNumber(s.count) });
    if (s.outliers.length > 0) rows.push({ color: tokens.texts.muted, name: "outliers", value: fmtNumber(s.outliers.length) });
    return {
      label: name,
      value: `median ${fmtStat(s.median)}, middle half ${fmtStat(s.q1)}–${fmtStat(s.q3)}`,
      rows,
    };
  };

  const activate = (i: number, anchor: Element) => {
    const m = marks[i];
    if (!m) return;
    if (menu.open) {
      const d = describe(m);
      menu.open({ label: d.label, value: d.value }, anchor);
    } else {
      setSelected((prev) => (prev === i ? null : i));
    }
  };

  const roving = useRovingFocus<SVGGElement>({
    count: marks.length,
    onActivate: (i) => {
      const el = canvasRef.current?.querySelector(`[data-mark="${i}"]`);
      if (el) activate(i, el);
    },
  });

  if (marks.length === 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload had no usable values." />
      </div>
    );
  }

  // ----- shared value axis --------------------------------------------------
  let lo: number;
  let hi: number;
  if (hist) {
    lo = hist.min;
    hi = hist.max;
  } else {
    const present = boxes.filter((b): b is BoxStats => b !== null);
    lo = Math.min(...present.map((b) => Math.min(b.min, ...b.outliers)));
    hi = Math.max(...present.map((b) => Math.max(b.max, ...b.outliers)));
    const pad = (hi - lo) * 0.04 || Math.abs(hi) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  for (const m of markers ?? []) {
    lo = Math.min(lo, m.value);
    hi = Math.max(hi, m.value);
  }
  if (!(hi > lo)) hi = lo + 1;

  const multi = groups.length > 1 || isBox;
  const longest = groups.reduce((n, g) => Math.max(n, Math.min(g.name.length, LABEL_MAX_CHARS)), 0);
  const labelW = multi ? Math.max(LABEL_MIN, Math.min(LABEL_MAX, longest * LABEL_CHAR_PX + 20)) : 44;
  const plotW = Math.max(80, width - labelW - RIGHT_PAD);
  const xOf = (v: number) => labelW + ((v - lo) / (hi - lo)) * plotW;
  const top = markers?.length ? MARKER_HEADROOM : 6;
  const rowH = isBox ? BOX_ROW : groups.length > 1 ? MULTI_HIST_HEIGHT : SINGLE_HIST_HEIGHT;
  const gap = isBox ? 0 : HIST_GAP;
  const plotH = groups.length * rowH + (groups.length - 1) * gap;
  const height = top + plotH + AXIS_HEIGHT;
  const rowTop = (g: number) => top + g * (rowH + gap);
  const ticks = linearTicks(lo, hi, Math.max(2, Math.floor(plotW / 90)));

  const accent = tokens.series[0]!;
  const numStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums" as const,
    fill: tokens.texts.muted,
  };
  const nameStyle = {
    fontFamily: tokens.typography.family.sans,
    fontSize: 12,
    fill: tokens.texts.primary,
  };

  const copyCsv = () => {
    if (hist) {
      const body: CsvCell[][] = hist.groups.flatMap((g) => g.bins.map((b) => [g.name, b.start, b.end, b.count]));
      return copyText(toCsv(["group", "start", "end", "count"], body));
    }
    const body: CsvCell[][] = boxes.map((b, i) => [
      groups[i]!.name,
      b?.min,
      b?.q1,
      b?.median,
      b?.q3,
      b?.max,
      b?.mean,
      b?.count,
      b?.outliers.join(" "),
    ]);
    return copyText(toCsv(["group", "min", "q1", "median", "q3", "max", "mean", "count", "outliers"], body));
  };
  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "distribution", tokens.surfaces.bg);
  };

  const showTip = (i: number, x: number, y: number) => {
    if (!menu.element) setTooltip({ mark: i, x, y });
  };
  const hideTip = () => setTooltip(null);

  /** role="button" on an SVG <g>: a real <button> cannot exist inside <svg>. */
  const markProps = (i: number, aria: string) => {
    const { ref, tabIndex, onFocus, onKeyDown } = roving.itemProps(i);
    return {
      ref,
      tabIndex,
      "data-mark": i,
      className: "sigil-mark",
      role: "button",
      "aria-label": aria,
      "aria-pressed": menu.open ? undefined : selected === i,
      "aria-haspopup": menu.open ? ("menu" as const) : undefined,
      style: { cursor: "pointer", outline: "none" },
      opacity: selected === null || selected === i ? 1 : UNSELECTED_OPACITY,
      onKeyDown,
      onFocus: (e: React.FocusEvent<SVGGElement>) => {
        onFocus();
        const box = e.currentTarget.getBoundingClientRect();
        showTip(i, box.left + box.width / 2, box.bottom);
      },
      onBlur: hideTip,
      onMouseEnter: (e: React.MouseEvent) => showTip(i, e.clientX, e.clientY),
      onMouseMove: (e: React.MouseEvent) => showTip(i, e.clientX, e.clientY),
      onMouseLeave: hideTip,
      onClick: (e: React.MouseEvent<SVGGElement>) => {
        hideTip();
        activate(i, e.currentTarget);
      },
    };
  };

  let body: React.ReactNode = null;
  if (width > 0 && hist) {
    let markIndex = 0;
    const peak = hist.peak || 1;
    body = hist.groups.map((g, gi) => {
      const y0 = rowTop(gi);
      const base = y0 + rowH;
      return (
        <g key={`${g.name}-${gi}`}>
          {multi && (
            <>
              <text x={labelW - 10} y={y0 + rowH / 2 - 6} textAnchor="end" dominantBaseline="central" style={nameStyle}>
                {truncate(g.name, LABEL_MAX_CHARS)}
              </text>
              <text x={labelW - 10} y={y0 + rowH / 2 + 9} textAnchor="end" dominantBaseline="central" style={numStyle}>
                n = {fmtCompact(g.total)}
              </text>
            </>
          )}
          <line x1={labelW} x2={labelW + plotW} y1={base} y2={base} stroke={tokens.chartLines.axis} />
          {g.bins.map((b, bi) => {
            const i = markIndex++;
            const x = xOf(b.start);
            const w = Math.max(1, xOf(b.end) - x - 1);
            const h = (b.count / peak) * (rowH - 6);
            const share = g.total > 0 ? b.count / g.total : 0;
            return (
              <g
                key={`${gi}-${bi}`}
                {...markProps(
                  i,
                  `${groups.length > 1 ? `${g.name}, ` : ""}${fmtStat(b.start)} to ${fmtStat(b.end)}: ${fmtNumber(b.count)}, ${(share * 100).toFixed(1)}%`,
                )}
              >
                <rect x={x} y={y0} width={w + 1} height={rowH} fill="transparent" />
                <rect x={x} y={base - h} width={w} height={h} rx={1.5} fill={accent} />
              </g>
            );
          })}
          {!multi && (
            <text x={labelW - 8} y={y0 + 8} textAnchor="end" style={numStyle}>
              {fmtCompact(peak)}
            </text>
          )}
          {g.median !== undefined && Number.isFinite(g.median) && (
            <g pointerEvents="none">
              <line
                x1={xOf(g.median)}
                x2={xOf(g.median)}
                y1={y0}
                y2={base}
                stroke={tokens.texts.secondary}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <text x={xOf(g.median) + 4} y={y0 + 10} style={{ ...numStyle, fill: tokens.texts.secondary }}>
                median {fmtStat(g.median)}
              </text>
            </g>
          )}
        </g>
      );
    });
  } else if (width > 0) {
    let markIndex = 0;
    body = boxes.map((s, gi) => {
      if (!s) return null;
      const i = markIndex++;
      const cy = rowTop(gi) + rowH / 2;
      const half = BOX_THICKNESS / 2;
      return (
        <g key={`${groups[gi]!.name}-${gi}`}>
          <text x={labelW - 10} y={cy} textAnchor="end" dominantBaseline="central" style={nameStyle}>
            {truncate(groups[gi]!.name, LABEL_MAX_CHARS)}
          </text>
          <g
            {...markProps(
              i,
              `${groups[gi]!.name}: median ${fmtStat(s.median)}, quartiles ${fmtStat(s.q1)} to ${fmtStat(s.q3)}, whiskers ${fmtStat(s.min)} to ${fmtStat(s.max)}${s.outliers.length ? `, ${countOf(s.outliers.length, "outlier")}` : ""}`,
            )}
          >
            <rect x={labelW} y={cy - rowH / 2} width={plotW} height={rowH} fill="transparent" />
            <line x1={xOf(s.min)} x2={xOf(s.q1)} y1={cy} y2={cy} stroke={tokens.texts.secondary} strokeWidth={1.25} />
            <line x1={xOf(s.q3)} x2={xOf(s.max)} y1={cy} y2={cy} stroke={tokens.texts.secondary} strokeWidth={1.25} />
            <line x1={xOf(s.min)} x2={xOf(s.min)} y1={cy - half / 2} y2={cy + half / 2} stroke={tokens.texts.secondary} strokeWidth={1.25} />
            <line x1={xOf(s.max)} x2={xOf(s.max)} y1={cy - half / 2} y2={cy + half / 2} stroke={tokens.texts.secondary} strokeWidth={1.25} />
            <rect
              x={xOf(s.q1)}
              y={cy - half}
              width={Math.max(1, xOf(s.q3) - xOf(s.q1))}
              height={BOX_THICKNESS}
              rx={3}
              fill={accent}
              fillOpacity={0.28}
              stroke={accent}
              strokeWidth={1.25}
            />
            <line x1={xOf(s.median)} x2={xOf(s.median)} y1={cy - half} y2={cy + half} stroke={tokens.texts.primary} strokeWidth={2.25} />
            {s.mean !== undefined && (
              <path
                d={`M ${xOf(s.mean)} ${cy - 4} l 4 4 l -4 4 l -4 -4 z`}
                fill={tokens.surfaces.surface}
                stroke={tokens.texts.primary}
                strokeWidth={1.25}
              />
            )}
            {s.outliers.map((v, k) => (
              <circle
                key={k}
                cx={xOf(v)}
                cy={cy}
                r={2.75}
                fill="none"
                stroke={tokens.texts.secondary}
                strokeWidth={1.25}
              />
            ))}
          </g>
        </g>
      );
    });
  }

  const totalObs = hist
    ? hist.groups.reduce((n, g) => n + g.total, 0)
    : boxes.reduce((n, b) => n + (b?.count ?? 0), 0);
  const kpi = (() => {
    if (!isBox && groups.length === 1 && hist?.groups[0]?.median !== undefined) {
      return { value: fmtStat(hist.groups[0].median), caption: `median${unit}` };
    }
    if (totalObs > 0) return { value: fmtCompact(totalObs), caption: totalObs === 1 ? "observation" : "observations" };
    return { value: String(groups.length), caption: groups.length === 1 ? "group" : "groups" };
  })();

  const binWidth = hist?.groups.find((g) => g.bins.length > 0)?.bins[0];

  return (
    <div className="sigil-root" ref={containerRef}>
      <ChartHeader title={title} kpi={kpi}>
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </ChartHeader>
      <div className="sigil-canvas" ref={canvasRef} style={{ position: "relative", minHeight: 0 }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ display: "block", maxWidth: "100%" }}
            aria-label={chartLabel(
              title,
              isBox ? "box plot" : "histogram",
              isBox
                ? countOf(groups.length, "group")
                : `${countOf(groups.length, "group")}, ${countOf(marks.length, "bucket")}`,
            )}
          >
            {ticks.map((t) => (
              <g key={`tick-${t}`}>
                <line x1={xOf(t)} x2={xOf(t)} y1={top} y2={top + plotH} stroke={tokens.chartLines.grid} />
                <text x={xOf(t)} y={top + plotH + 16} textAnchor="middle" style={numStyle}>
                  {fmtCompact(t)}
                </text>
              </g>
            ))}
            {valueLabel && (
              <text
                x={labelW + plotW / 2}
                y={height - 6}
                textAnchor="middle"
                style={{ ...nameStyle, fontSize: 11, fill: tokens.texts.secondary }}
              >
                {valueLabel}
              </text>
            )}
            {body}
            {(markers ?? []).map((m, k) => {
              const c = referenceToneColors(tokens, m.tone);
              const x = xOf(m.value);
              const anchor = x > labelW + plotW * 0.8 ? "end" : "start";
              return (
                <g key={k} pointerEvents="none">
                  <line x1={x} x2={x} y1={top - 4} y2={top + plotH} stroke={c.stroke} strokeWidth={1.5} strokeDasharray={REFERENCE_DASH} />
                  <text
                    x={anchor === "end" ? x - 4 : x + 4}
                    y={top - 6}
                    textAnchor={anchor}
                    style={{ ...numStyle, fill: c.text, fontWeight: 600 }}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <div className="sigil-caption">
        {isBox
          ? "Box: middle half (25th–75th percentile) · line: median · whiskers: up to 1.5 × the box width · dots: outliers"
          : binWidth
            ? `Bucket width ${fmtStat(binWidth.end - binWidth.start)}${groups.length > 1 ? " · every group on the same scales" : ""}`
            : null}
      </div>
      {tooltip && marks[tooltip.mark] && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y + 12, pointerEvents: "none", zIndex: 10 }}>
          {(() => {
            const d = describe(marks[tooltip.mark]!);
            return <SigilTooltip active label={d.label} payload={d.rows} />;
          })()}
        </div>
      )}
      {menu.element}
    </div>
  );
}
