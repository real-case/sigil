import { useEffect, useMemo, useRef, useState } from "react";
import type { HeatmapPayload, HeatmapCell } from "../../shared/payloads.js";
import { useTheme } from "../shared/theme.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { EmptyState } from "../shared/EmptyState.js";
import { ColorScaleLegend, SCALE_INK, colorScale, scaleInk } from "../shared/color-scale.js";
import { useRovingFocus } from "../shared/roving-focus.js";
import { useMarkMenu } from "../shared/MarkMenu.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";
import { cohortAverage, fmtCohortSize, fmtPercent } from "./cohort-math.js";
import { CalendarView } from "./CalendarView.js";

const CHART_HEIGHT = 360;
const RIGHT_MARGIN = 16;
const BOTTOM_MARGIN = 8;
const X_LABEL_HEIGHT = 84;
const X_LABEL_MAX_CHARS = 16;
const X_LABEL_TILT_RIGHT_PAD = 72;
const Y_LABEL_BASE_WIDTH = 48;
const Y_LABEL_PER_CHAR = 6.5;
const Y_LABEL_MAX_CHARS = 16;
const AXIS_TITLE_GUTTER = 22;
const X_LABEL_TILT_THRESHOLD = 8;
const CELL_GAP = 2;
const CELL_RADIUS = 2;
const NUMBER_FMT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });
// Cohort mode: the size column, the gap above the average row, and the
// smallest cell that still fits its printed percentage.
const SIZE_COL_WIDTH = 60;
const AVG_ROW_GAP = 8;
const COHORT_MIN_CELL_HEIGHT = 22;
const COHORT_X_LABEL_HEIGHT = 32;
const COHORT_MIN_CELL_WIDTH = 40;
const CELL_TEXT_MIN_WIDTH = 34;
const CELL_TEXT_MIN_HEIGHT = 16;

interface CellLookup {
  values: Map<number, HeatmapCell>;
  min: number;
  max: number;
}

function buildLookup(cells: HeatmapCell[], cols: number): CellLookup {
  let min = Infinity;
  let max = -Infinity;
  const values = new Map<number, HeatmapCell>();
  for (const c of cells) {
    if (!Number.isFinite(c.value)) continue;
    values.set(c.y * cols + c.x, c);
    if (c.value < min) min = c.value;
    if (c.value > max) max = c.value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 0;
  }
  return { values, min, max };
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

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

/** One cell of the grid as the view addresses it: a payload cell, or the
 *  derived average row in cohort mode. */
interface GridCell {
  value: number;
  row: string;
  column: string;
  /** Cohort mode: the cohort's size, when known (never on the average row). */
  size?: number;
  average: boolean;
}

interface TooltipState {
  cell: GridCell;
  pageX: number;
  pageY: number;
}

/**
 * render_heatmap's three modes share one tool and one bundle; the calendar
 * lays out dates, not an index-addressed matrix, so it is its own component.
 */
export function HeatmapView({ payload }: { payload: HeatmapPayload }) {
  if (payload.mode === "calendar") return <CalendarView payload={payload} />;
  return <MatrixHeatmapView payload={payload} />;
}

// Stable empties, so a calendar-shaped payload that reaches the matrix (it
// cannot via the guard, but types allow it) does not re-key every memo.
const NO_LABELS: string[] = [];
const NO_CELLS: HeatmapCell[] = [];

function MatrixHeatmapView({ payload }: { payload: HeatmapPayload }) {
  const tokens = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const { title, xlabel, ylabel } = payload;
  const xLabels = payload.xLabels ?? NO_LABELS;
  const yLabels = payload.yLabels ?? NO_LABELS;
  const cells = payload.cells ?? NO_CELLS;
  const cohort = payload.mode === "cohort";
  const sizes =
    cohort && payload.cohortSizes?.length === yLabels.length ? payload.cohortSizes : undefined;
  const fmtValue = cohort ? fmtPercent : (v: number) => NUMBER_FMT.format(v);

  const lookup = useMemo(
    () => buildLookup(cells, xLabels.length),
    [cells, xLabels.length],
  );
  const average = useMemo(
    () => (cohort ? cohortAverage(cells, xLabels.length, yLabels.length, sizes) : null),
    [cohort, cells, xLabels.length, yLabels.length, sizes],
  );
  const averageLabel = average?.weighted ? "Weighted avg" : "Average";

  const columns = xLabels.length;
  // The average row sits below the cohorts, in the same roving sequence so the
  // arrow keys reach it, but it is derived — it has a readout and no menu.
  const gridRows = yLabels.length + (average ? 1 : 0);
  const gridCellAt = (index: number): GridCell | null => {
    const x = index % columns;
    const y = Math.floor(index / columns);
    if (average && y === yLabels.length) {
      const v = average.values[x];
      return v == null
        ? null
        : { value: v, row: averageLabel, column: xLabels[x] ?? "", average: true };
    }
    const cell = lookup.values.get(index);
    if (!cell) return null;
    return {
      value: cell.value,
      row: yLabels[cell.y] ?? "",
      column: xLabels[cell.x] ?? "",
      size: sizes?.[cell.y],
      average: false,
    };
  };
  const cellKey = (x: number, y: number) => `${x}:${y}`;
  const toggleSelection = (key: string) =>
    setSelected((prev) => (prev === key ? null : key));

  // On a host that takes follow-up messages a cell opens the drill-down menu
  // and is marked selected while it is open; elsewhere a click toggles the
  // selection highlight, as it always did.
  const menu = useMarkMenu(title, payload.followUps);
  const activateCell = (index: number, anchor: Element | null) => {
    const cell = lookup.values.get(index);
    if (!cell) return;
    const key = cellKey(index % columns, Math.floor(index / columns));
    if (menu.open && anchor) {
      setSelected(key);
      menu.open(
        {
          label: `${yLabels[cell.y] ?? ""}, ${xLabels[cell.x] ?? ""}`,
          value: fmtValue(cell.value),
        },
        anchor,
      );
    } else {
      toggleSelection(key);
    }
  };

  // The matrix is one composite widget, not one tab stop per cell: arrows walk
  // it in two dimensions and Enter/Space selects, exactly as a click does.
  // Value-less cells keep their place in the sequence so arrowing across the
  // grid never falls into a hole.
  const roving = useRovingFocus<SVGRectElement>({
    count: columns * gridRows,
    columns,
    onActivate: (index) =>
      activateCell(index, canvasRef.current?.querySelector(`[data-cell="${index}"]`) ?? null),
  });

  if (xLabels.length === 0 || yLabels.length === 0 || cells.length === 0) {
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

  const longestY = yLabels.reduce((m, s) => Math.max(m, s.length), 0);
  const yLabelWidth = Math.min(
    Y_LABEL_BASE_WIDTH + Math.min(longestY, Y_LABEL_MAX_CHARS) * Y_LABEL_PER_CHAR,
    160,
  );
  const yAxisOffset = ylabel ? AXIS_TITLE_GUTTER : 0;
  const xAxisOffset = xlabel ? AXIS_TITLE_GUTTER : 0;
  // Cohort periods ("M0", "W12") are short however many there are, so only
  // their length decides; a matrix also tilts once it has many columns.
  const xLabelTilt =
    (!cohort && xLabels.length > X_LABEL_TILT_THRESHOLD) || xLabels.some((l) => l.length > 6);
  // Straight cohort labels need one line of headroom, not the tilt's 84 px.
  const xLabelHeight = cohort && !xLabelTilt ? COHORT_X_LABEL_HEIGHT : X_LABEL_HEIGHT;
  // Tilted (-45°) labels are anchored at the column centre and ascend to the
  // upper-right, so the rightmost label needs room past the matrix edge.
  const rightPad = xLabelTilt ? X_LABEL_TILT_RIGHT_PAD : RIGHT_MARGIN;
  const sizeColWidth = sizes ? SIZE_COL_WIDTH : 0;
  const usableWidth = Math.max(width - yLabelWidth - rightPad - yAxisOffset - sizeColWidth, 80);
  // A cohort cell has to hold its printed percentage; on a narrow host the
  // table keeps that width and scrolls sideways rather than shrinking to
  // unreadable slivers.
  const cellWidth = Math.max(usableWidth / xLabels.length, cohort ? COHORT_MIN_CELL_WIDTH : 0);
  const avgGap = average ? AVG_ROW_GAP : 0;
  const usableHeight =
    CHART_HEIGHT - xLabelHeight - BOTTOM_MARGIN - xAxisOffset - avgGap;
  const cellHeight = Math.max(cohort ? COHORT_MIN_CELL_HEIGHT : 8, usableHeight / gridRows);
  // Row y → top edge; the average row is pushed down by the gap that sets it
  // apart from the cohorts.
  const rowTop = (y: number) =>
    matrixTop + cellHeight * y + (average && y === yLabels.length ? avgGap : 0);

  const matrixLeft = yLabelWidth + yAxisOffset + sizeColWidth;
  const matrixTop = xLabelHeight;
  const matrixHeight = cellHeight * gridRows + avgGap;
  const totalHeight = matrixTop + matrixHeight + BOTTOM_MARGIN + xAxisOffset;
  const totalWidth = Math.max(matrixLeft + cellWidth * xLabels.length + rightPad, 1);

  const scaleOptions = {
    kind: payload.scale,
    min: lookup.min,
    max: lookup.max,
    midpoint: payload.midpoint,
  };
  const colorAt = colorScale(tokens, scaleOptions);
  const inkAt = scaleInk(tokens, scaleOptions);
  const printValues =
    cohort && cellWidth >= CELL_TEXT_MIN_WIDTH && cellHeight >= CELL_TEXT_MIN_HEIGHT;

  const copyCsv = () => {
    const header = sizes ? ["", "Size", ...xLabels] : ["", ...xLabels];
    const body: CsvCell[][] = yLabels.map((yl, y) => {
      const row: CsvCell[] = sizes ? [yl, sizes[y] ?? ""] : [yl];
      for (let x = 0; x < xLabels.length; x++) {
        const cell = lookup.values.get(y * xLabels.length + x);
        row.push(cell ? cell.value : "");
      }
      return row;
    });
    if (average) {
      body.push([
        averageLabel,
        ...(sizes ? [sizes.reduce((a, b) => a + b, 0)] : []),
        ...average.values.map((v) => (v == null ? "" : Math.round(v * 100) / 100)),
      ]);
    }
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "heatmap", tokens.surfaces.bg);
  };

  const handleCellEnter = (cell: GridCell, ev: React.MouseEvent) => {
    setTooltip({ cell, pageX: ev.clientX, pageY: ev.clientY });
  };
  const handleCellMove = (ev: React.MouseEvent) => {
    setTooltip((prev) =>
      prev ? { ...prev, pageX: ev.clientX, pageY: ev.clientY } : prev,
    );
  };
  const handleCellLeave = () => setTooltip(null);
  // Keyboard focus has no pointer to anchor to, so the tooltip hangs off the
  // focused cell itself — the same readout a hovering mouse gets.
  const handleCellFocus = (cell: GridCell, el: SVGRectElement) => {
    const box = el.getBoundingClientRect();
    setTooltip({ cell, pageX: box.left + box.width / 2, pageY: box.bottom });
  };

  const opacityFor = (key: string) =>
    selected === null || selected === key ? 1 : 0.3;

  const axisLabelStyle = {
    fill: tokens.texts.secondary,
    fontSize: tokens.typography.scale.label.fontSize,
    fontFamily: tokens.typography.family.sans,
  };

  const tickLabelStyle = {
    fill: tokens.texts.muted,
    fontSize: tokens.typography.scale.tick.fontSize,
    fontFamily: tokens.typography.family.mono,
    letterSpacing: `${tokens.typography.scale.tick.letterSpacing}em`,
    textTransform: "uppercase" as const,
  };

  return (
    <div className="sigil-root" ref={containerRef}>
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </div>
      <div
        className="sigil-canvas"
        ref={canvasRef}
        style={{ position: "relative", overflowX: cohort ? "auto" : undefined }}
      >
        {width > 0 && (
          <svg
            width={totalWidth}
            height={totalHeight}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            style={{ display: "block", maxWidth: cohort ? "none" : "100%" }}
            // A bare aria-label rather than role="img": role="img" would prune
            // the cells below out of the accessibility tree, and they are the
            // part worth reaching.
            aria-label={chartLabel(
              title,
              "heatmap",
              `${countOf(yLabels.length, "row")} by ${countOf(columns, "column")}`,
            )}
          >
            {ylabel && (
              <text
                x={AXIS_TITLE_GUTTER / 2}
                y={matrixTop + matrixHeight / 2}
                style={axisLabelStyle}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(-90 ${AXIS_TITLE_GUTTER / 2} ${matrixTop + matrixHeight / 2})`}
              >
                {ylabel}
              </text>
            )}

            {yLabels.map((label, y) => (
              <text
                key={`yl-${y}`}
                x={matrixLeft - sizeColWidth - 8}
                y={rowTop(y) + cellHeight / 2}
                style={tickLabelStyle}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {truncate(label, Y_LABEL_MAX_CHARS)}
              </text>
            ))}
            {average && (
              <text
                x={matrixLeft - sizeColWidth - 8}
                y={rowTop(yLabels.length) + cellHeight / 2}
                style={{ ...tickLabelStyle, fill: tokens.texts.secondary, fontWeight: 600 }}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {averageLabel}
              </text>
            )}

            {sizes && (
              <g>
                <text
                  x={matrixLeft - 10}
                  y={matrixTop - 8}
                  style={tickLabelStyle}
                  textAnchor="end"
                >
                  Size
                </text>
                {sizes.map((size, y) => (
                  <text
                    key={`size-${y}`}
                    x={matrixLeft - 10}
                    y={rowTop(y) + cellHeight / 2}
                    style={{ ...tickLabelStyle, textTransform: "none", fill: tokens.texts.secondary }}
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {fmtCohortSize(size)}
                  </text>
                ))}
              </g>
            )}

            {xLabels.map((label, x) => {
              const cx = matrixLeft + cellWidth * x + cellWidth / 2;
              const cy = matrixTop - 8;
              return (
                <text
                  key={`xl-${x}`}
                  x={cx}
                  y={cy}
                  style={tickLabelStyle}
                  textAnchor={xLabelTilt ? "start" : "middle"}
                  transform={xLabelTilt ? `rotate(-45 ${cx} ${cy})` : undefined}
                >
                  {truncate(label, xLabelTilt ? X_LABEL_MAX_CHARS : 12)}
                </text>
              );
            })}

            {/* biome-ignore lint/a11y/useSemanticElements: a <table> cannot exist inside an <svg>; grid/row/gridcell is the only way to say "matrix" here. */}
            <g
              role="grid"
              aria-label={
                cohort
                  ? `${title}, ${countOf(yLabels.length, "cohort")} by ${countOf(columns, "period")}, with ${averageLabel.toLowerCase()} row`
                  : `${title}, ${yLabels.length} by ${columns} matrix`
              }
            >
              {[...yLabels, ...(average ? [averageLabel] : [])].map((yLabel, y) => (
                // biome-ignore lint/a11y/useSemanticElements: as above — <tr> cannot exist inside an <svg>.
                <g role="row" key={`row-${y}`}>
                  {xLabels.map((xLabel, x) => {
                    const index = y * columns + x;
                    const cell = gridCellAt(index);
                    // Only payload cells open the drill-down menu or take the
                    // selection; the average row is a readout.
                    const interactive = cell !== null && !cell.average;
                    const key = cellKey(x, y);
                    const sizeNote =
                      cell?.size !== undefined ? ` of ${fmtCohortSize(cell.size)}` : "";
                    const drawWidth = Math.max(0, cellWidth - CELL_GAP);
                    const drawHeight = Math.max(0, cellHeight - CELL_GAP);
                    const { ref, tabIndex, onFocus, onKeyDown } = roving.itemProps(index);
                    const cellX = matrixLeft + cellWidth * x + CELL_GAP / 2;
                    const cellY = rowTop(y) + CELL_GAP / 2;
                    return (
                      // biome-ignore lint/a11y/useSemanticElements: as above — <td> cannot exist inside an <svg>.
                      <rect
                        key={key}
                        ref={ref}
                        className="sigil-mark"
                        role="gridcell"
                        data-cell={index}
                        aria-haspopup={interactive && menu.open ? "menu" : undefined}
                        tabIndex={tabIndex}
                        aria-label={
                          cell
                            ? `${yLabel}, ${xLabel}: ${fmtValue(cell.value)}${sizeNote}`
                            : `${yLabel}, ${xLabel}: ${cohort ? "not reached yet" : "no data"}`
                        }
                        aria-selected={interactive ? selected === key : undefined}
                        x={cellX}
                        y={cellY}
                        width={drawWidth}
                        height={drawHeight}
                        rx={CELL_RADIUS}
                        ry={CELL_RADIUS}
                        // A cohort that has not reached a period leaves a hole,
                        // so the table keeps its triangle instead of a row of
                        // grey "zeros".
                        fill={
                          cell
                            ? colorAt(cell.value)
                            : cohort
                              ? "transparent"
                              : tokens.surfaces.surfaceSunken
                        }
                        fillOpacity={interactive ? opacityFor(key) : 1}
                        style={{
                          cursor: interactive ? "pointer" : "default",
                          transition:
                            "fill-opacity var(--sigil-duration-fast) var(--sigil-easing-standard)",
                        }}
                        onKeyDown={onKeyDown}
                        onFocus={(e) => {
                          onFocus();
                          if (cell) handleCellFocus(cell, e.currentTarget);
                        }}
                        onBlur={handleCellLeave}
                        onMouseEnter={cell ? (e) => handleCellEnter(cell, e) : undefined}
                        onMouseMove={cell ? handleCellMove : undefined}
                        onMouseLeave={cell ? handleCellLeave : undefined}
                        onClick={interactive ? (e) => activateCell(index, e.currentTarget) : undefined}
                      />
                    );
                  })}
                </g>
              ))}
            </g>

            {/* Cohort cells print their percentage. A layer of its own, after
                the grid, so the text never sits between a row and its cells;
                each cell's aria-label already carries the same figure. */}
            {printValues && (
              <g pointerEvents="none">
                {Array.from({ length: columns * gridRows }, (_, index) => {
                  const cell = gridCellAt(index);
                  if (!cell) return null;
                  const x = index % columns;
                  const y = Math.floor(index / columns);
                  const key = cellKey(x, y);
                  return (
                    <text
                      key={`v-${key}`}
                      x={matrixLeft + cellWidth * x + cellWidth / 2}
                      y={rowTop(y) + cellHeight / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={SCALE_INK[inkAt(cell.value)]}
                      fillOpacity={cell.average ? 1 : opacityFor(key)}
                      style={{
                        fontFamily: tokens.typography.family.mono,
                        fontSize: 11,
                        fontWeight: cell.average ? 600 : 400,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtPercent(Math.round(cell.value * 10) / 10)}
                    </text>
                  );
                })}
              </g>
            )}

            {xlabel && (
              <text
                x={matrixLeft + (cellWidth * xLabels.length) / 2}
                y={totalHeight - 4}
                style={axisLabelStyle}
                textAnchor="middle"
              >
                {xlabel}
              </text>
            )}
          </svg>
        )}

        {width > 0 && lookup.max > lookup.min && (
          <ColorScaleLegend
            min={lookup.min}
            max={lookup.max}
            colorAt={colorAt}
            midpoint={payload.scale === "diverging" ? (payload.midpoint ?? 0) : undefined}
            tokens={tokens}
            format={cohort ? fmtPercent : undefined}
          />
        )}

        {tooltip && (
          <div
            style={{
              position: "fixed",
              top: tooltip.pageY + 12,
              left: tooltip.pageX + 12,
              background:
                "color-mix(in oklab, var(--sigil-surface-elevated) 78%, transparent)",
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
              border: "1px solid var(--sigil-border-default)",
              borderRadius: "var(--sigil-radius-md)",
              color: "var(--sigil-text)",
              fontFamily: "var(--sigil-font-tooltip-family)",
              fontSize: "var(--sigil-font-tooltip-size)",
              lineHeight: "var(--sigil-font-tooltip-line-height)",
              padding: "10px 12px",
              minWidth: 180,
              boxShadow: "var(--sigil-shadow-mid)",
              pointerEvents: "none",
              zIndex: 10,
              animation:
                "sigil-tooltip-enter var(--sigil-duration-base) var(--sigil-easing-standard)",
            }}
          >
            <div
              style={{
                color: "var(--sigil-text-secondary)",
                marginBottom: 4,
              }}
            >
              {tooltip.cell.row} · {tooltip.cell.column}
            </div>
            <div
              style={{
                fontFamily: "var(--sigil-font-value-sm-family)",
                fontSize: "var(--sigil-font-value-sm-size)",
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtValue(tooltip.cell.value)}
            </div>
            {tooltip.cell.size !== undefined && (
              <div style={{ color: "var(--sigil-text-muted)", marginTop: 2 }}>
                ≈ {NUMBER_FMT.format(Math.round((tooltip.cell.size * tooltip.cell.value) / 100))} of{" "}
                {NUMBER_FMT.format(tooltip.cell.size)}
              </div>
            )}
            {tooltip.cell.average && (
              <div style={{ color: "var(--sigil-text-muted)", marginTop: 2 }}>
                {averageLabel === "Weighted avg"
                  ? "weighted by cohort size"
                  : "mean of the cohorts that reached it"}
              </div>
            )}
          </div>
        )}
      </div>
      {menu.element}
    </div>
  );
}
