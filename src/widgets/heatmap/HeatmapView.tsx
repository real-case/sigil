import { useEffect, useMemo, useRef, useState } from "react";
import type { HeatmapPayload, HeatmapCell } from "../../shared/payloads.js";
import { useTheme } from "../shared/theme.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { EmptyState } from "../shared/EmptyState.js";
import { ColorScaleLegend, intensityAlpha } from "../shared/color-scale.js";
import { useRovingFocus } from "../shared/roving-focus.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

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

interface TooltipState {
  cell: HeatmapCell;
  pageX: number;
  pageY: number;
}

export function HeatmapView({ payload }: { payload: HeatmapPayload }) {
  const tokens = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const { title, xLabels, yLabels, cells, xlabel, ylabel } = payload;

  const lookup = useMemo(
    () => buildLookup(cells, xLabels.length),
    [cells, xLabels.length],
  );

  const columns = xLabels.length;
  const cellKey = (x: number, y: number) => `${x}:${y}`;
  const toggleSelection = (key: string) =>
    setSelected((prev) => (prev === key ? null : key));

  // The matrix is one composite widget, not one tab stop per cell: arrows walk
  // it in two dimensions and Enter/Space selects, exactly as a click does.
  // Value-less cells keep their place in the sequence so arrowing across the
  // grid never falls into a hole.
  const roving = useRovingFocus<SVGRectElement>({
    count: columns * yLabels.length,
    columns,
    onActivate: (index) => {
      if (!lookup.values.has(index)) return;
      toggleSelection(cellKey(index % columns, Math.floor(index / columns)));
    },
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
  const xLabelTilt =
    xLabels.length > X_LABEL_TILT_THRESHOLD || xLabels.some((l) => l.length > 6);
  // Tilted (-45°) labels are anchored at the column centre and ascend to the
  // upper-right, so the rightmost label needs room past the matrix edge.
  const rightPad = xLabelTilt ? X_LABEL_TILT_RIGHT_PAD : RIGHT_MARGIN;
  const usableWidth = Math.max(width - yLabelWidth - rightPad - yAxisOffset, 80);
  const cellWidth = usableWidth / xLabels.length;
  const usableHeight =
    CHART_HEIGHT - X_LABEL_HEIGHT - BOTTOM_MARGIN - xAxisOffset;
  const cellHeight = Math.max(8, usableHeight / yLabels.length);

  const matrixLeft = yLabelWidth + yAxisOffset;
  const matrixTop = X_LABEL_HEIGHT;
  const totalHeight = matrixTop + cellHeight * yLabels.length + BOTTOM_MARGIN + xAxisOffset;
  const totalWidth = Math.max(matrixLeft + cellWidth * xLabels.length + rightPad, 1);

  const seriesHue = tokens.series[0]!;

  const copyCsv = () => {
    const header = ["", ...xLabels];
    const body: CsvCell[][] = yLabels.map((yl, y) => {
      const row: CsvCell[] = [yl];
      for (let x = 0; x < xLabels.length; x++) {
        const cell = lookup.values.get(y * xLabels.length + x);
        row.push(cell ? cell.value : "");
      }
      return row;
    });
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "heatmap", tokens.surfaces.bg);
  };

  const handleCellEnter = (cell: HeatmapCell, ev: React.MouseEvent) => {
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
  const handleCellFocus = (cell: HeatmapCell, el: SVGRectElement) => {
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
      <div className="sigil-canvas" ref={canvasRef} style={{ position: "relative" }}>
        {width > 0 && (
          <svg
            width={totalWidth}
            height={totalHeight}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            style={{ display: "block", maxWidth: "100%" }}
            // A bare aria-label rather than role="img": role="img" would prune
            // the cells below out of the accessibility tree, and they are the
            // part worth reaching.
            aria-label={`${title} — heatmap, ${yLabels.length} rows by ${columns} columns`}
          >
            {ylabel && (
              <text
                x={AXIS_TITLE_GUTTER / 2}
                y={matrixTop + (cellHeight * yLabels.length) / 2}
                style={axisLabelStyle}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(-90 ${AXIS_TITLE_GUTTER / 2} ${matrixTop + (cellHeight * yLabels.length) / 2})`}
              >
                {ylabel}
              </text>
            )}

            {yLabels.map((label, y) => (
              <text
                key={`yl-${y}`}
                x={matrixLeft - 8}
                y={matrixTop + cellHeight * y + cellHeight / 2}
                style={tickLabelStyle}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {truncate(label, Y_LABEL_MAX_CHARS)}
              </text>
            ))}

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
            <g role="grid" aria-label={`${title}, ${yLabels.length} by ${columns} matrix`}>
              {yLabels.map((yLabel, y) => (
                // biome-ignore lint/a11y/useSemanticElements: as above — <tr> cannot exist inside an <svg>.
                <g role="row" key={`row-${y}`}>
                  {xLabels.map((xLabel, x) => {
                    const index = y * columns + x;
                    const cell = lookup.values.get(index);
                    const key = cellKey(x, y);
                    const alpha = cell
                      ? intensityAlpha(cell.value, lookup.min, lookup.max)
                      : 0;
                    const drawWidth = Math.max(0, cellWidth - CELL_GAP);
                    const drawHeight = Math.max(0, cellHeight - CELL_GAP);
                    const { ref, tabIndex, onFocus, onKeyDown } = roving.itemProps(index);
                    return (
                      // biome-ignore lint/a11y/useSemanticElements: as above — <td> cannot exist inside an <svg>.
                      <rect
                        key={key}
                        ref={ref}
                        className="sigil-mark"
                        role="gridcell"
                        tabIndex={tabIndex}
                        aria-label={
                          cell
                            ? `${yLabel}, ${xLabel}: ${NUMBER_FMT.format(cell.value)}`
                            : `${yLabel}, ${xLabel}: no data`
                        }
                        aria-selected={selected === key}
                        x={matrixLeft + cellWidth * x + CELL_GAP / 2}
                        y={matrixTop + cellHeight * y + CELL_GAP / 2}
                        width={drawWidth}
                        height={drawHeight}
                        rx={CELL_RADIUS}
                        ry={CELL_RADIUS}
                        fill={cell ? seriesHue : tokens.surfaces.surfaceSunken}
                        fillOpacity={cell ? alpha * opacityFor(key) : 1}
                        style={{
                          cursor: cell ? "pointer" : "default",
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
                        onClick={cell ? () => toggleSelection(key) : undefined}
                      />
                    );
                  })}
                </g>
              ))}
            </g>

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
            hue={seriesHue}
            tokens={tokens}
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
              {yLabels[tooltip.cell.y]} · {xLabels[tooltip.cell.x]}
            </div>
            <div
              style={{
                fontFamily: "var(--sigil-font-value-sm-family)",
                fontSize: "var(--sigil-font-value-sm-size)",
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {NUMBER_FMT.format(tooltip.cell.value)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
