// render_timeline: intervals in lanes — Gantt-style bars or a state timeline
// (plan task 4.5, program item 13).
//
// - Without `state` every bar takes one accent colour: the lane label already
//   says what a bar is, so a colour per lane would only repeat it.
// - With `state`, colour means state. Declared tones map to the status tokens
//   (success / warning / danger / info / neutral), so "down" can never come out
//   green; untoned states take categorical slots. The legend always names
//   them, and every bar's accessible name says its state in words (WCAG 1.4.1).
// - An open-ended item runs to the next change in its lane, then to `now`,
//   then to the end of the chart, and its tooltip says the end was inferred.
// - Times print in UTC; see time-scale.ts.

import { useEffect, useMemo, useRef, useState } from "react";
import type { StateTone, TimelinePayload } from "../../shared/payloads.js";
import { useTheme, seriesColor, type ChartDesignTokens } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip, type TooltipRow } from "../shared/SigilTooltip.js";
import { EmptyState } from "../shared/EmptyState.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { useRovingFocus } from "../shared/roving-focus.js";
import { useMarkMenu } from "../shared/MarkMenu.js";
import { SCALE_INK } from "../shared/color-scale.js";
import { contrastRatio } from "../shared/color-audit.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";
import {
  fmtDuration,
  fmtTime,
  hasClock,
  numberTicks,
  timeKind,
  timeTicks,
  timelineLayout,
  toTime,
  type ResolvedItem,
} from "./time-scale.js";

const LANE = 30;
const BAR = 18;
const AXIS = 28;
const TOP_PAD = 22;
const RIGHT_PAD = 18;
const LABEL_MIN = 64;
const LABEL_MAX = 180;
const LABEL_CHAR_PX = 7;
const LABEL_MAX_CHARS = 24;
const BAR_TEXT_MIN = 42;
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

/** Fill for a tone: the status token's text member is tuned for contrast on the surface. */
export function toneFill(tokens: ChartDesignTokens, tone: StateTone): string {
  if (tone === "neutral") return tokens.borders.strong;
  return tokens.semantic[tone].text;
}

/** State name → colour: declared tones first, then categorical slots in first-seen order. */
export function stateColors(tokens: ChartDesignTokens, payload: TimelinePayload): Map<string, string> {
  const colors = new Map<string, string>();
  let slot = 0;
  for (const s of payload.states ?? []) {
    colors.set(s.name, s.tone ? toneFill(tokens, s.tone) : seriesColor(tokens, slot++, "cycle"));
  }
  for (const it of payload.items) {
    if (it.state && !colors.has(it.state)) colors.set(it.state, seriesColor(tokens, slot++, "cycle"));
  }
  return colors;
}

const inkOn = (fill: string) =>
  contrastRatio(fill, SCALE_INK.dark) >= contrastRatio(fill, SCALE_INK.light) ? SCALE_INK.dark : SCALE_INK.light;

interface TooltipState {
  index: number;
  x: number;
  y: number;
}

export function TimelineView({ payload }: { payload: TimelinePayload }) {
  const tokens = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const [selected, setSelected] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { title, unit, milestones } = payload;
  const kind = timeKind(payload);
  const clock = kind === "date" && hasClock(payload);
  const layout = useMemo(() => timelineLayout(payload), [payload]);
  const colors = useMemo(() => stateColors(tokens, payload), [tokens, payload]);
  const usesState = payload.items.some((i) => i.state);
  const menu = useMarkMenu(title, payload.followUps);

  const { rows, items, min, max, now } = layout;
  const fmtT = (t: number) => fmtTime(t, kind, clock, unit);

  const describe = (r: ResolvedItem) => {
    const name = r.item.label ?? r.item.state ?? r.row;
    const span = `${fmtT(r.start)} – ${r.open ? `${fmtT(r.end)} (open)` : fmtT(r.end)}`;
    return { name, span, duration: fmtDuration(r.end - r.start, kind, unit) };
  };

  const activate = (i: number, anchor: Element) => {
    const r = items[i];
    if (!r) return;
    if (menu.open) {
      const d = describe(r);
      menu.open(
        { label: `${r.row}: ${d.name}`, value: `${d.span}, ${d.duration}` },
        anchor,
      );
    } else {
      setSelected((prev) => (prev === i ? null : i));
    }
  };

  const roving = useRovingFocus<SVGGElement>({
    count: items.length,
    onActivate: (i) => {
      const el = canvasRef.current?.querySelector(`[data-item="${i}"]`);
      if (el) activate(i, el);
    },
  });

  if (items.length === 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload had no intervals." />
      </div>
    );
  }

  const longest = rows.reduce((n, r) => Math.max(n, Math.min(r.length, LABEL_MAX_CHARS)), 0);
  const labelW = Math.max(LABEL_MIN, Math.min(LABEL_MAX, longest * LABEL_CHAR_PX + 18));
  const plotW = Math.max(120, width - labelW - RIGHT_PAD);
  const xOf = (t: number) => labelW + ((t - min) / (max - min)) * plotW;
  const laneTop = (r: number) => TOP_PAD + r * LANE;
  const plotH = rows.length * LANE;
  const height = TOP_PAD + plotH + AXIS;
  const approx = Math.max(2, Math.floor(plotW / 110));
  const ticks = kind === "date" ? timeTicks(min, max, approx) : numberTicks(min, max, approx);
  const rowIndex = new Map(rows.map((r, i) => [r, i]));
  const accent = tokens.series[0]!;
  const fillOf = (r: ResolvedItem) => (r.item.state ? (colors.get(r.item.state) ?? accent) : accent);

  const numStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums" as const,
    fill: tokens.texts.muted,
  };
  const laneStyle = { fontFamily: tokens.typography.family.sans, fontSize: 12, fill: tokens.texts.primary };

  const copyCsv = () => {
    const body: CsvCell[][] = items.map((r) => [
      r.row,
      r.item.label ?? "",
      r.item.state ?? "",
      kind === "date" ? new Date(r.start).toISOString() : r.start,
      kind === "date" ? new Date(r.end).toISOString() : r.end,
      r.open ? "inferred" : "",
    ]);
    return copyText(toCsv(["row", "label", "state", "start", "end", "end source"], body));
  };
  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "timeline", tokens.surfaces.bg);
  };

  const showTip = (i: number, x: number, y: number) => {
    if (!menu.element) setTooltip({ index: i, x, y });
  };
  const hideTip = () => setTooltip(null);

  /** role="button" on an SVG <g>: a real <button> cannot exist inside <svg>. */
  const itemProps = (i: number, aria: string) => {
    const { ref, tabIndex, onFocus, onKeyDown } = roving.itemProps(i);
    return {
      ref,
      tabIndex,
      "data-item": i,
      className: "sigil-mark",
      role: "button",
      "aria-label": aria,
      "aria-pressed": menu.open ? undefined : selected === i,
      "aria-haspopup": menu.open ? ("menu" as const) : undefined,
      opacity: selected === null || selected === i ? 1 : UNSELECTED_OPACITY,
      style: { cursor: "pointer", outline: "none" },
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

  const tooltipRows = (r: ResolvedItem): TooltipRow[] => {
    const d = describe(r);
    const color = fillOf(r);
    const out: TooltipRow[] = [];
    if (r.item.state) out.push({ color, name: "state", value: r.item.state });
    out.push({ color, name: "from", value: fmtT(r.start) });
    out.push({ color, name: r.open ? "until (inferred)" : "until", value: fmtT(r.end) });
    out.push({ color: tokens.texts.muted, name: "duration", value: d.duration });
    return out;
  };

  const globalMilestones = (milestones ?? []).filter((m) => !m.row);
  const laneMilestones = (milestones ?? []).filter((m) => m.row);
  const totalSpan = fmtDuration(max - min, kind, unit);

  return (
    <div className="sigil-root" ref={containerRef}>
      <ChartHeader title={title} kpi={{ value: String(items.length), caption: `${items.length === 1 ? "interval" : "intervals"} · ${totalSpan}` }}>
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
              usesState ? "state timeline" : "timeline",
              `${countOf(rows.length, "lane")}, ${countOf(items.length, "interval")}, ${fmtT(min)} to ${fmtT(max)}`,
            )}
          >
            {rows.map((r, i) => (
              <g key={`lane-${r}`}>
                {i % 2 === 1 && (
                  <rect x={labelW} y={laneTop(i)} width={plotW} height={LANE} fill={tokens.surfaces.surfaceSunken} opacity={0.6} />
                )}
                <text x={labelW - 10} y={laneTop(i) + LANE / 2} textAnchor="end" dominantBaseline="central" style={laneStyle}>
                  {truncate(r, LABEL_MAX_CHARS)}
                </text>
              </g>
            ))}
            {ticks.map((t) => (
              <g key={`tick-${t.at}`}>
                <line x1={xOf(t.at)} x2={xOf(t.at)} y1={TOP_PAD} y2={TOP_PAD + plotH} stroke={tokens.chartLines.grid} />
                <text x={xOf(t.at)} y={TOP_PAD + plotH + 16} textAnchor="middle" style={numStyle}>
                  {t.label}
                </text>
              </g>
            ))}
            {items.map((r, i) => {
              const lane = rowIndex.get(r.row) ?? 0;
              const x = xOf(r.start);
              const w = Math.max(3, xOf(r.end) - x - (usesState ? 1 : 0));
              const y = laneTop(lane) + (LANE - BAR) / 2;
              const fill = fillOf(r);
              const text = r.item.label ?? (usesState ? r.item.state : undefined);
              const d = describe(r);
              return (
                <g
                  key={`item-${r.index}`}
                  {...itemProps(
                    i,
                    `${r.row}: ${d.name}${r.item.state && r.item.label ? `, ${r.item.state}` : ""}, ${d.span}, ${d.duration}`,
                  )}
                >
                  <rect x={x} y={y} width={w} height={BAR} rx={usesState ? 2 : 4} fill={fill} />
                  {r.open && !usesState && (
                    <rect
                      x={x + w - Math.min(14, w / 2)}
                      y={y}
                      width={Math.min(14, w / 2)}
                      height={BAR}
                      fill={tokens.surfaces.surface}
                      opacity={0.35}
                    />
                  )}
                  {text && w >= BAR_TEXT_MIN && (
                    <text
                      x={x + 6}
                      y={y + BAR / 2}
                      dominantBaseline="central"
                      pointerEvents="none"
                      style={{ fontFamily: tokens.typography.family.sans, fontSize: 11, fill: inkOn(fill) }}
                    >
                      {truncate(text, Math.max(2, Math.floor((w - 10) / 6.5)))}
                    </text>
                  )}
                </g>
              );
            })}
            {laneMilestones.map((m, k) => {
              const lane = rowIndex.get(m.row!) ?? 0;
              const x = xOf(toTime(m.at));
              const cy = laneTop(lane) + LANE / 2;
              return (
                <g key={`ms-${k}`} pointerEvents="none">
                  <path
                    d={`M ${x} ${cy - 7} l 7 7 l -7 7 l -7 -7 z`}
                    fill={tokens.texts.primary}
                    stroke={tokens.surfaces.surface}
                    strokeWidth={1.5}
                  />
                  <text x={x + 10} y={cy - 9} style={{ ...numStyle, fill: tokens.texts.secondary }}>
                    {m.label}
                  </text>
                </g>
              );
            })}
            {globalMilestones.map((m, k) => {
              const x = xOf(toTime(m.at));
              const anchor = x > labelW + plotW * 0.8 ? "end" : "start";
              return (
                <g key={`gms-${k}`} pointerEvents="none">
                  <line x1={x} x2={x} y1={TOP_PAD - 4} y2={TOP_PAD + plotH} stroke={tokens.texts.secondary} strokeDasharray="4 3" />
                  <text x={anchor === "end" ? x - 4 : x + 4} y={TOP_PAD - 8} textAnchor={anchor} style={{ ...numStyle, fill: tokens.texts.secondary }}>
                    ◆ {m.label}
                  </text>
                </g>
              );
            })}
            {now !== undefined && (
              <g pointerEvents="none">
                <line x1={xOf(now)} x2={xOf(now)} y1={TOP_PAD - 4} y2={TOP_PAD + plotH} stroke={tokens.semantic.danger.text} strokeWidth={1.5} />
                <text
                  x={xOf(now) > labelW + plotW * 0.85 ? xOf(now) - 4 : xOf(now) + 4}
                  y={TOP_PAD - 8}
                  textAnchor={xOf(now) > labelW + plotW * 0.85 ? "end" : "start"}
                  style={{ ...numStyle, fill: tokens.semantic.danger.text, fontWeight: 600 }}
                >
                  Now
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
      {usesState && (
        <ul className="sigil-tl-key" aria-label="States">
          {[...colors.entries()].map(([name, color]) => (
            <li key={name}>
              <i style={{ background: color }} aria-hidden="true" />
              {name}
            </li>
          ))}
        </ul>
      )}
      {kind === "date" && clock && <div className="sigil-caption">Times in UTC</div>}
      {tooltip && items[tooltip.index] && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y + 12, pointerEvents: "none", zIndex: 10 }}>
          <SigilTooltip
            active
            label={`${items[tooltip.index]!.row} · ${describe(items[tooltip.index]!).name}`}
            payload={tooltipRows(items[tooltip.index]!)}
          />
        </div>
      )}
      {menu.element}
    </div>
  );
}
