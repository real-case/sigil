// render_heatmap mode "calendar": one value per day, weeks as columns and
// weekdays as rows (plan task 4.6, program item 15).
//
// - Same colour scale and legend as the matrix (shared color-scale), so a
//   sequential calendar of activity and a diverging calendar of "vs plan" read
//   the same way the matrix does.
// - A day the payload does not mention is drawn as "no data", in the sunken
//   surface, never as 0 — a gap in collection must not look like a quiet day.
// - Days outside the range are not drawn at all, so a partial first or last
//   week is visibly partial.
// - Keyboard: one tab stop for the whole calendar. Up / Down move a day (the
//   rows are weekdays), Left / Right move a week, Home / End jump to the ends.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { HeatmapPayload } from "../../shared/payloads.js";
import { useTheme } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { EmptyState } from "../shared/EmptyState.js";
import { SigilTooltip, type TooltipRow } from "../shared/SigilTooltip.js";
import { ColorScaleLegend, colorScale } from "../shared/color-scale.js";
import { useRovingFocus } from "../shared/roving-focus.js";
import { useMarkMenu } from "../shared/MarkMenu.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { fmtCompact, fmtNumber } from "../shared/chart-text.js";
import { toCsv, copyText, copySvgAsPng } from "../shared/export-utils.js";
import { calendarLayout, fmtDay, weekdayNames, type CalendarCell } from "./calendar-math.js";

const ROW_LABEL_WIDTH = 34;
const MONTH_ROW = 18;
const BLOCK_TITLE = 18;
const BLOCK_GAP = 14;
const CELL_GAP = 2;
const MIN_CELL = 10;
const MAX_CELL = 18;
const NO_DAYS: NonNullable<HeatmapPayload["days"]> = [];

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

interface TooltipState {
  cell: CalendarCell;
  x: number;
  y: number;
}

export function CalendarView({ payload }: { payload: HeatmapPayload }) {
  const tokens = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const [selected, setSelected] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { title, valueLabel } = payload;
  const days = payload.days ?? NO_DAYS;
  const weekStart = payload.weekStart ?? "monday";
  const layout = useMemo(() => calendarLayout(days, weekStart), [days, weekStart]);
  const menu = useMarkMenu(title, payload.followUps);

  // Chronological order across every block: the roving index of a day.
  const cells = useMemo(() => layout.blocks.flatMap((b) => b.cells), [layout]);
  const indexOfDay = useMemo(() => new Map(cells.map((c, i) => [c.day, i])), [cells]);

  const fmtValue = (v: number) => `${fmtNumber(v)}${valueLabel ? ` ${valueLabel}` : ""}`;

  const activate = (i: number, anchor: Element) => {
    const cell = cells[i];
    if (!cell || cell.value === undefined) return;
    if (menu.open) {
      setSelected(cell.date);
      menu.open({ label: fmtDay(cell.date), value: fmtValue(cell.value) }, anchor);
    } else {
      setSelected((prev) => (prev === cell.date ? null : cell.date));
    }
  };

  const roving = useRovingFocus<SVGRectElement>({
    count: cells.length,
    onActivate: (i) => {
      const el = canvasRef.current?.querySelector(`[data-day-index="${i}"]`);
      if (el) activate(i, el);
    },
  });

  if (layout.blocks.length === 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload had no days." />
      </div>
    );
  }

  const maxWeeks = Math.max(...layout.blocks.map((b) => b.weeks));
  const fit = (width - ROW_LABEL_WIDTH - 8) / maxWeeks;
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Number.isFinite(fit) ? fit : MIN_CELL));
  const multi = layout.blocks.length > 1;
  const blockHeight = (multi ? BLOCK_TITLE : 0) + MONTH_ROW + cell * 7;
  const svgWidth = ROW_LABEL_WIDTH + cell * maxWeeks + 4;
  const svgHeight = layout.blocks.length * blockHeight + (layout.blocks.length - 1) * BLOCK_GAP;

  const scaleOptions = {
    kind: payload.scale,
    min: layout.min,
    max: layout.max,
    midpoint: payload.midpoint,
  };
  const colorAt = colorScale(tokens, scaleOptions);
  const rowNames = weekdayNames(weekStart);

  const copyCsv = () =>
    copyText(
      toCsv(
        ["date", valueLabel ?? "value"],
        cells.map((c) => [c.date, c.value ?? ""]),
      ),
    );
  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "calendar-heatmap", tokens.surfaces.bg);
  };

  const showTip = (c: CalendarCell, x: number, y: number) => {
    if (!menu.element) setTooltip({ cell: c, x, y });
  };
  const hideTip = () => setTooltip(null);

  // Left / Right step a week, the visual neighbour in a weeks-as-columns grid;
  // the roving hook handles Up / Down (± one day), Home / End and Enter.
  const onCellKey = (c: CalendarCell, fallback: (e: KeyboardEvent) => void) => (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const target = indexOfDay.get(c.day + (e.key === "ArrowLeft" ? -7 : 7));
      if (target !== undefined) {
        canvasRef.current?.querySelector<SVGRectElement>(`[data-day-index="${target}"]`)?.focus();
      }
      return;
    }
    fallback(e);
  };

  const tickStyle = {
    fill: tokens.texts.muted,
    fontSize: tokens.typography.scale.tick.fontSize,
    fontFamily: tokens.typography.family.mono,
    letterSpacing: `${tokens.typography.scale.tick.letterSpacing}em`,
  };

  const tooltipRows = (c: CalendarCell): TooltipRow[] => [
    c.value === undefined
      ? { color: tokens.surfaces.surfaceSunken, name: valueLabel ?? "value", value: "no data" }
      : { color: colorAt(c.value), name: valueLabel ?? "value", value: fmtNumber(c.value) },
  ];

  const average = layout.counted > 0 ? layout.total / layout.counted : 0;

  return (
    <div className="sigil-root" ref={containerRef}>
      <ChartHeader
        title={title}
        kpi={{
          value: fmtCompact(layout.total),
          caption: `${valueLabel ?? "total"} · ${countOf(layout.counted, "day")}`,
        }}
      >
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </ChartHeader>
      <div className="sigil-canvas" ref={canvasRef} style={{ position: "relative", overflowX: "auto", minHeight: 0 }}>
        {width > 0 && (
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ display: "block" }}
            aria-label={chartLabel(
              title,
              "calendar heatmap",
              `${countOf(layout.counted, "day")} from ${fmtDay(layout.first)} to ${fmtDay(layout.last)}`,
            )}
          >
            {layout.blocks.map((b, bi) => {
              const top = bi * (blockHeight + BLOCK_GAP);
              const gridTop = top + (multi ? BLOCK_TITLE : 0) + MONTH_ROW;
              return (
                <g key={b.label}>
                  {multi && (
                    <text
                      x={0}
                      y={top + 12}
                      style={{ ...tickStyle, fill: tokens.texts.secondary, fontWeight: 600 }}
                    >
                      {b.label}
                    </text>
                  )}
                  {b.months.map((m) => (
                    <text
                      key={`${b.label}-${m.col}-${m.label}`}
                      x={ROW_LABEL_WIDTH + m.col * cell}
                      y={gridTop - 6}
                      style={tickStyle}
                    >
                      {m.label}
                    </text>
                  ))}
                  {rowNames.map((name, r) =>
                    r % 2 === 0 ? null : (
                      <text
                        key={`${b.label}-row-${name}`}
                        x={ROW_LABEL_WIDTH - 6}
                        y={gridTop + r * cell + cell / 2}
                        textAnchor="end"
                        dominantBaseline="central"
                        style={tickStyle}
                      >
                        {name}
                      </text>
                    ),
                  )}
                  {/* biome-ignore lint/a11y/useSemanticElements: a <table> cannot exist inside an <svg>; grid/gridcell is the only way to say "calendar" here. */}
                  <g role="grid" aria-label={`${title}, ${b.label}`}>
                    {/* biome-ignore lint/a11y/useSemanticElements: as above — <tr> cannot exist inside an <svg>. */}
                    <g role="row">
                      {b.cells.map((c) => {
                        const i = indexOfDay.get(c.day)!;
                        const { ref, tabIndex, onFocus, onKeyDown } = roving.itemProps(i);
                        const hasValue = c.value !== undefined;
                        const dim = selected !== null && selected !== c.date;
                        return (
                          // biome-ignore lint/a11y/useSemanticElements: as above — <td> cannot exist inside an <svg>.
                          <rect
                            key={c.date}
                            ref={ref}
                            role="gridcell"
                            className="sigil-mark"
                            data-day-index={i}
                            tabIndex={tabIndex}
                            aria-label={`${fmtDay(c.date)}: ${hasValue ? fmtValue(c.value!) : "no data"}`}
                            aria-selected={hasValue ? selected === c.date : undefined}
                            aria-haspopup={hasValue && menu.open ? "menu" : undefined}
                            x={ROW_LABEL_WIDTH + c.col * cell + CELL_GAP / 2}
                            y={gridTop + c.row * cell + CELL_GAP / 2}
                            width={Math.max(1, cell - CELL_GAP)}
                            height={Math.max(1, cell - CELL_GAP)}
                            rx={2}
                            fill={hasValue ? colorAt(c.value!) : tokens.surfaces.surfaceSunken}
                            stroke={hasValue ? undefined : tokens.borders.subtle}
                            strokeWidth={hasValue ? undefined : 0.5}
                            fillOpacity={dim ? 0.3 : 1}
                            style={{ cursor: hasValue ? "pointer" : "default", outline: "none" }}
                            onKeyDown={onCellKey(c, onKeyDown)}
                            onFocus={(e) => {
                              onFocus();
                              const box = e.currentTarget.getBoundingClientRect();
                              showTip(c, box.left + box.width / 2, box.bottom);
                            }}
                            onBlur={hideTip}
                            onMouseEnter={(e) => showTip(c, e.clientX, e.clientY)}
                            onMouseMove={(e) => showTip(c, e.clientX, e.clientY)}
                            onMouseLeave={hideTip}
                            onClick={(e) => {
                              hideTip();
                              activate(i, e.currentTarget);
                            }}
                          />
                        );
                      })}
                    </g>
                  </g>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      {width > 0 && layout.max > layout.min && (
        <ColorScaleLegend
          min={layout.min}
          max={layout.max}
          colorAt={colorAt}
          midpoint={payload.scale === "diverging" ? (payload.midpoint ?? 0) : undefined}
          tokens={tokens}
        />
      )}
      <div className="sigil-caption">
        {layout.busiest ? `Highest: ${fmtDay(layout.busiest.date)}, ${fmtValue(layout.busiest.value)} · ` : ""}
        daily average {fmtNumber(Math.round(average * 10) / 10)}
        {layout.missing > 0 ? ` · ${countOf(layout.missing, "day")} without data` : ""}
      </div>
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y + 12, pointerEvents: "none", zIndex: 10 }}>
          <SigilTooltip active label={fmtDay(tooltip.cell.date)} payload={tooltipRows(tooltip.cell)} />
        </div>
      )}
      {menu.element}
    </div>
  );
}
