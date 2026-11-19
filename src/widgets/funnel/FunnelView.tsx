// render_funnel: ordered stages as bars sized by how many reached each one.
//
// Design choices, each from the dataviz research behind Phase 2:
// - Bars are left-aligned on a shared baseline, not centred into a trapezoid.
//   Length from a common edge is the channel people compare most accurately;
//   a centred funnel shape is decoration that halves that accuracy.
// - One hue, ordinal: the stages are one measure at successive points, so they
//   step down the theme's sequential ramp (darkest first) instead of taking
//   eight categorical colours that would claim they are different things.
// - What a stage lost stays visible as a faint "ghost" of the previous bar, so
//   the leak is a shape, not only a number.
// - The worst step is called out in words as well as colour (WCAG 1.4.1).
// - A stage larger than the one before it is drawn at its real size and
//   labelled "grew", not capped — see funnel-math.ts.

import { useEffect, useMemo, useRef, useState } from "react";
import type { FunnelPayload } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip, type TooltipRow } from "../shared/SigilTooltip.js";
import { EmptyState } from "../shared/EmptyState.js";
import { fmtNumber, fmtCompact } from "../shared/chart-text.js";
import { rampAt } from "../shared/color-scale.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { useRovingFocus } from "../shared/roving-focus.js";
import { useMarkMenu } from "../shared/MarkMenu.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";
import { fmtConversion, funnelLayout, type FunnelRow } from "./funnel-math.js";

const ROW_HEIGHT = 34;
const DROP_GAP = 22;
const BAR_RADIUS = 4;
const LABEL_MIN = 96;
const LABEL_MAX = 200;
const LABEL_CHAR_PX = 7.2;
const LABEL_MAX_CHARS = 26;
const VALUE_COL = 132;
const COLUMN_PLOT_HEIGHT = 240;
const COLUMN_LABEL_HEIGHT = 40;
const COLUMN_TOP = 44;
const COLUMN_GAP_RATIO = 0.34;
const GHOST_OPACITY = 0.22;
const UNSELECTED_OPACITY = 0.35;
// The ramp's lightest steps sink into the surface; stop short of them.
const RAMP_FLOOR = 2;

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

/** Stage i of n on the sequential ramp, darkest (highest) first. */
export function stageColor(tokens: ChartDesignTokens, i: number, n: number): string {
  const top = tokens.sequential.length - 1;
  const t = n <= 1 ? 0 : i / (n - 1);
  return rampAt(tokens.sequential, top - t * (top - RAMP_FLOOR));
}

interface TooltipState {
  index: number;
  x: number;
  y: number;
}

export function FunnelView({ payload }: { payload: FunnelPayload }) {
  const tokens = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const [selected, setSelected] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  // Defaults mirror the render_funnel handler, for the tile path where no
  // handler ran. See the note atop shared/payloads.ts.
  const { title, steps, orientation = "horizontal", showDropOff = true, valueLabel } = payload;
  const isVertical = orientation === "vertical";
  const layout = useMemo(() => funnelLayout(steps), [steps]);
  const menu = useMarkMenu(title, payload.followUps);

  const markOf = (i: number) => {
    const row = layout.rows[i]!;
    return {
      label: row.label,
      value: `step ${i + 1} of ${layout.rows.length}, ${fmtNumber(row.value)}${valueLabel ? ` ${valueLabel}` : ""}, ${fmtConversion(row.ofFirst)} of first`,
    };
  };

  const activate = (i: number, anchor: Element) => {
    if (menu.open) menu.open(markOf(i), anchor);
    else setSelected((prev) => (prev === i ? null : i));
  };

  const roving = useRovingFocus<SVGGElement>({
    count: steps.length,
    onActivate: (i) => {
      const el = canvasRef.current?.querySelector(`[data-step="${i}"]`);
      if (el) activate(i, el);
    },
  });

  if (steps.length === 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

  const { rows, max, biggestDrop } = layout;
  const last = rows[rows.length - 1]!;
  const overall = rows.length > 1 ? last.ofFirst : null;

  const copyCsv = () => {
    const header = ["stage", valueLabel ?? "value", "% of first", "% of previous", "lost", "conversion time"];
    const body: CsvCell[][] = rows.map((r, i) => [
      r.label,
      r.value,
      r.ofFirst === null ? "" : (r.ofFirst * 100).toFixed(2),
      r.ofPrevious === null ? "" : (r.ofPrevious * 100).toFixed(2),
      r.lost,
      i === 0 ? "" : (steps[i]?.conversionTime ?? ""),
    ]);
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "funnel", tokens.surfaces.bg);
  };

  const tooltipRows = (i: number): TooltipRow[] => {
    const r = rows[i]!;
    const color = stageColor(tokens, i, rows.length);
    const out: TooltipRow[] = [
      { color, name: valueLabel ?? "value", value: fmtNumber(r.value) },
      { color, name: "of first", value: fmtConversion(r.ofFirst) },
    ];
    if (i > 0) {
      out.push({ color, name: "of previous", value: fmtConversion(r.ofPrevious) });
      out.push(
        r.grew
          ? { color: tokens.texts.muted, name: "grew by", value: fmtNumber(r.value - rows[i - 1]!.value) }
          : { color: tokens.texts.muted, name: "lost", value: fmtNumber(r.lost) },
      );
      const time = steps[i]?.conversionTime;
      if (time) out.push({ color: tokens.texts.muted, name: "time from previous", value: time });
    }
    return out;
  };

  const ariaFor = (r: FunnelRow, i: number) => {
    const parts = [
      `Step ${i + 1}, ${r.label}: ${fmtNumber(r.value)}${valueLabel ? ` ${valueLabel}` : ""}`,
      `${fmtConversion(r.ofFirst)} of first`,
    ];
    if (i > 0) parts.push(`${fmtConversion(r.ofPrevious)} of previous`);
    if (r.grew) parts.push("larger than the previous step");
    if (showDropOff && i === biggestDrop) parts.push("largest drop");
    const time = i > 0 ? steps[i]?.conversionTime : undefined;
    if (time) parts.push(`time from previous ${time}`);
    return parts.join(", ");
  };

  const dropText = (i: number): string | null => {
    if (i === 0 || !showDropOff) return null;
    const r = rows[i]!;
    if (r.grew) return `▲ grew ${fmtConversion(r.ofPrevious === null ? null : r.ofPrevious - 1)}`;
    if (r.ofPrevious === null) return null;
    const time = steps[i]?.conversionTime;
    return `↓ ${fmtConversion(r.ofPrevious)} continued · −${fmtCompact(r.lost)}${time ? ` · ${time}` : ""}`;
  };

  const markStyle = { cursor: "pointer", outline: "none" } as const;
  const opacityOf = (i: number) => (selected === null || selected === i ? 1 : UNSELECTED_OPACITY);
  // The menu sits where the tooltip would; while it is open the tooltip waits.
  const showTip = (i: number, x: number, y: number) => {
    if (!menu.element) setTooltip({ index: i, x, y });
  };
  const hideTip = () => setTooltip(null);
  const focusTip = (i: number, el: Element) => {
    const box = el.getBoundingClientRect();
    showTip(i, box.left + box.width / 2, box.bottom);
  };

  const textStyle = {
    fontFamily: tokens.typography.family.sans,
    fontSize: 13,
    fill: tokens.texts.primary,
  };
  const numStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: 12,
    fontVariantNumeric: "tabular-nums" as const,
    fill: tokens.texts.primary,
  };
  const mutedStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums" as const,
    fill: tokens.texts.muted,
  };
  const callout = tokens.semantic.warning.text;

  /**
   * Props every step's focusable group shares, whichever orientation draws it.
   * role="button" on an SVG <g>: a real <button> cannot exist inside <svg>.
   */
  const stepProps = (i: number) => {
    const { ref, tabIndex, onFocus, onKeyDown } = roving.itemProps(i);
    return {
      ref,
      tabIndex,
      "data-step": i,
      className: "sigil-mark",
      role: "button",
      "aria-label": ariaFor(rows[i]!, i),
      "aria-pressed": menu.open ? undefined : selected === i,
      "aria-haspopup": menu.open ? ("menu" as const) : undefined,
      style: markStyle,
      onKeyDown,
      onFocus: (e: React.FocusEvent<SVGGElement>) => {
        onFocus();
        focusTip(i, e.currentTarget);
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

  const svgLabel = chartLabel(
    title,
    "funnel chart",
    `${countOf(rows.length, "stage")}${overall !== null ? `, ${fmtConversion(overall)} overall` : ""}`,
  );

  let svg: React.ReactNode = null;
  if (width > 0 && !isVertical) {
    const longest = rows.reduce((m, r) => Math.max(m, Math.min(r.label.length, LABEL_MAX_CHARS)), 0);
    const labelW = Math.max(LABEL_MIN, Math.min(LABEL_MAX, longest * LABEL_CHAR_PX + 28));
    const plotW = Math.max(60, width - labelW - VALUE_COL);
    const rowPitch = ROW_HEIGHT + (showDropOff ? DROP_GAP : 8);
    const height = rows.length * rowPitch - (showDropOff ? DROP_GAP : 8) + 8;
    const scale = (v: number) => (max > 0 ? (v / max) * plotW : 0);
    svg = (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", maxWidth: "100%" }} aria-label={svgLabel}>
        {rows.map((r, i) => {
          const y = i * rowPitch;
          const prev = i > 0 ? rows[i - 1]!.value : 0;
          const w = Math.max(r.value > 0 ? 2 : 0, scale(r.value));
          const drop = dropText(i);
          const isWorst = showDropOff && i === biggestDrop;
          return (
            <g key={`${r.label}-${i}`}>
              {drop && (
                <text
                  x={labelW}
                  y={y - DROP_GAP / 2 + 4}
                  style={{ ...mutedStyle, fill: isWorst ? callout : mutedStyle.fill, fontWeight: isWorst ? 600 : 400 }}
                >
                  {isWorst ? `${drop} · largest drop` : drop}
                </text>
              )}
              <g {...stepProps(i)} opacity={opacityOf(i)}>
                <rect x={0} y={y} width={width} height={ROW_HEIGHT} fill="transparent" />
                <text x={labelW - 12} y={y + ROW_HEIGHT / 2} textAnchor="end" dominantBaseline="central" style={textStyle}>
                  {truncate(r.label, LABEL_MAX_CHARS)}
                </text>
                {i > 0 && prev > r.value && (
                  <rect
                    x={labelW}
                    y={y + 4}
                    width={scale(prev)}
                    height={ROW_HEIGHT - 8}
                    rx={BAR_RADIUS}
                    fill={stageColor(tokens, i, rows.length)}
                    fillOpacity={GHOST_OPACITY}
                  />
                )}
                <rect
                  x={labelW}
                  y={y + 4}
                  width={w}
                  height={ROW_HEIGHT - 8}
                  rx={BAR_RADIUS}
                  fill={stageColor(tokens, i, rows.length)}
                  stroke={isWorst ? callout : undefined}
                  strokeWidth={isWorst ? 1.5 : undefined}
                />
                <text x={labelW + plotW + 10} y={y + ROW_HEIGHT / 2 - 7} dominantBaseline="central" style={numStyle}>
                  {fmtNumber(r.value)}
                </text>
                <text x={labelW + plotW + 10} y={y + ROW_HEIGHT / 2 + 8} dominantBaseline="central" style={mutedStyle}>
                  {i === 0 ? "start" : `${fmtConversion(r.ofFirst)} of first`}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    );
  } else if (width > 0) {
    const n = rows.length;
    const slot = width / n;
    const colW = Math.max(8, slot * (1 - COLUMN_GAP_RATIO));
    const height = COLUMN_TOP + COLUMN_PLOT_HEIGHT + COLUMN_LABEL_HEIGHT;
    const base = COLUMN_TOP + COLUMN_PLOT_HEIGHT;
    const scale = (v: number) => (max > 0 ? (v / max) * COLUMN_PLOT_HEIGHT : 0);
    const maxChars = Math.max(4, Math.floor(slot / 7));
    svg = (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", maxWidth: "100%" }} aria-label={svgLabel}>
        {rows.map((r, i) => {
          const cx = slot * i + slot / 2;
          const x = cx - colW / 2;
          const h = Math.max(r.value > 0 ? 2 : 0, scale(r.value));
          const prevH = i > 0 ? scale(rows[i - 1]!.value) : 0;
          const isWorst = showDropOff && i === biggestDrop;
          const color = stageColor(tokens, i, n);
          return (
            <g key={`${r.label}-${i}`} {...stepProps(i)} opacity={opacityOf(i)}>
              <rect x={slot * i} y={0} width={slot} height={height} fill="transparent" />
              {i > 0 && prevH > h && (
                <rect x={x} y={base - prevH} width={colW} height={prevH} rx={BAR_RADIUS} fill={color} fillOpacity={GHOST_OPACITY} />
              )}
              <rect
                x={x}
                y={base - h}
                width={colW}
                height={h}
                rx={BAR_RADIUS}
                fill={color}
                stroke={isWorst ? callout : undefined}
                strokeWidth={isWorst ? 1.5 : undefined}
              />
              <text x={cx} y={Math.min(base - h, base - prevH) - 22} textAnchor="middle" style={numStyle}>
                {fmtCompact(r.value)}
              </text>
              <text
                x={cx}
                y={Math.min(base - h, base - prevH) - 8}
                textAnchor="middle"
                style={{ ...mutedStyle, fill: isWorst ? callout : mutedStyle.fill, fontWeight: isWorst ? 600 : 400 }}
              >
                {i === 0
                  ? "start"
                  : !showDropOff
                    ? fmtConversion(r.ofFirst)
                    : r.grew
                      ? "▲ grew"
                      : `↓ ${fmtConversion(r.ofPrevious)}`}
              </text>
              <text x={cx} y={base + 18} textAnchor="middle" style={{ ...textStyle, fontSize: 12 }}>
                {truncate(r.label, maxChars)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  const worst = biggestDrop >= 0 && showDropOff ? rows[biggestDrop] : undefined;

  return (
    <div className="sigil-root" ref={containerRef}>
      <ChartHeader
        title={title}
        kpi={
          overall !== null
            ? { value: fmtConversion(overall), caption: `${truncate(rows[0]!.label, 18)} → ${truncate(last.label, 18)}` }
            : { value: fmtCompact(rows[0]!.value), caption: valueLabel ?? "total" }
        }
      >
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </ChartHeader>
      <div className="sigil-canvas" ref={canvasRef} style={{ position: "relative" }}>
        {svg}
      </div>
      {worst && (
        <div className="sigil-caption">
          Largest drop: {rows[biggestDrop - 1]!.label} → {worst.label}, {fmtConversion(worst.ofPrevious)} continued
        </div>
      )}
      {tooltip && rows[tooltip.index] && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y + 12, pointerEvents: "none", zIndex: 10 }}>
          <SigilTooltip active label={rows[tooltip.index]!.label} payload={tooltipRows(tooltip.index)} />
        </div>
      )}
      {menu.element}
    </div>
  );
}
