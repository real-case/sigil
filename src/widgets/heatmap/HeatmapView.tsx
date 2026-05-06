import { useEffect, useMemo, useRef, useState } from "react";
import type { HeatmapPayload, HeatmapCell } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const CHART_HEIGHT = 360;
const RIGHT_MARGIN = 16;
const BOTTOM_MARGIN = 8;
const X_LABEL_HEIGHT = 56;
const Y_LABEL_BASE_WIDTH = 48;
const Y_LABEL_PER_CHAR = 6.5;
const Y_LABEL_MAX_CHARS = 16;
const AXIS_TITLE_GUTTER = 22;
const X_LABEL_TILT_THRESHOLD = 8;
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

function parseHex(hex: string): [number, number, number] | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return [r, g, b];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function colorForValue(
  value: number,
  min: number,
  max: number,
  tokens: ChartDesignTokens,
): string {
  const range = max - min;
  const t = range === 0 ? 0.5 : Math.max(0, Math.min(1, (value - min) / range));
  const surface = parseHex(tokens.surfaceBackground) ?? [255, 255, 255];
  const accent = parseHex(tokens.seriesColors[0]!) ?? [99, 102, 241];
  const r = Math.round(lerp(surface[0], accent[0], t));
  const g = Math.round(lerp(surface[1], accent[1], t));
  const b = Math.round(lerp(surface[2], accent[2], t));
  return `rgb(${r}, ${g}, ${b})`;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function useContainerWidth(ref: React.RefObject<HTMLElement>): number {
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

  if (xLabels.length === 0 || yLabels.length === 0 || cells.length === 0) {
    return <EmptyState title={title} />;
  }

  const longestY = yLabels.reduce((m, s) => Math.max(m, s.length), 0);
  const yLabelWidth = Math.min(
    Y_LABEL_BASE_WIDTH + Math.min(longestY, Y_LABEL_MAX_CHARS) * Y_LABEL_PER_CHAR,
    160,
  );
  const yAxisOffset = ylabel ? AXIS_TITLE_GUTTER : 0;
  const xAxisOffset = xlabel ? AXIS_TITLE_GUTTER : 0;
  const usableWidth = Math.max(width - yLabelWidth - RIGHT_MARGIN - yAxisOffset, 80);
  const cellWidth = usableWidth / xLabels.length;
  const usableHeight =
    CHART_HEIGHT - X_LABEL_HEIGHT - BOTTOM_MARGIN - xAxisOffset;
  const cellHeight = Math.max(8, usableHeight / yLabels.length);
  const xLabelTilt = xLabels.length > X_LABEL_TILT_THRESHOLD || xLabels.some((l) => l.length > 6);

  const matrixLeft = yLabelWidth + yAxisOffset;
  const matrixTop = X_LABEL_HEIGHT;
  const totalHeight = matrixTop + cellHeight * yLabels.length + BOTTOM_MARGIN + xAxisOffset;
  const totalWidth = Math.max(matrixLeft + cellWidth * xLabels.length + RIGHT_MARGIN, 1);

  const cellKey = (x: number, y: number) => `${x}:${y}`;

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
    await copySvgAsPng(svg as SVGSVGElement, "heatmap", tokens.background);
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

  const opacityFor = (key: string) =>
    selected === null || selected === key ? 1 : 0.3;
  const toggleSelection = (key: string) =>
    setSelected((prev) => (prev === key ? null : key));

  return (
    <div className="sigil-root" ref={containerRef}>
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
        <Toolbar>
          <ToolbarButton label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </div>
      <div className="sigil-canvas" ref={canvasRef} style={{ position: "relative" }}>
        {width > 0 && (
          <svg
            width={totalWidth}
            height={totalHeight}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            style={{ display: "block", maxWidth: "100%" }}
          >
            {/* y-axis title */}
            {ylabel && (
              <text
                x={0}
                y={matrixTop + (cellHeight * yLabels.length) / 2}
                fill={tokens.textSecondary}
                fontSize={tokens.fontSize.label}
                fontFamily={tokens.fontFamily}
                textAnchor="middle"
                transform={`rotate(-90 0 ${matrixTop + (cellHeight * yLabels.length) / 2})`}
              >
                {ylabel}
              </text>
            )}

            {/* y-axis labels */}
            {yLabels.map((label, y) => (
              <text
                key={`yl-${y}`}
                x={matrixLeft - 8}
                y={matrixTop + cellHeight * y + cellHeight / 2}
                fill={tokens.textSecondary}
                fontSize={tokens.fontSize.label}
                fontFamily={tokens.fontFamily}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {truncate(label, Y_LABEL_MAX_CHARS)}
              </text>
            ))}

            {/* x-axis labels */}
            {xLabels.map((label, x) => {
              const cx = matrixLeft + cellWidth * x + cellWidth / 2;
              const cy = matrixTop - 6;
              return (
                <text
                  key={`xl-${x}`}
                  x={cx}
                  y={cy}
                  fill={tokens.textSecondary}
                  fontSize={tokens.fontSize.label}
                  fontFamily={tokens.fontFamily}
                  textAnchor={xLabelTilt ? "start" : "middle"}
                  transform={xLabelTilt ? `rotate(-30 ${cx} ${cy})` : undefined}
                >
                  {truncate(label, 12)}
                </text>
              );
            })}

            {/* cells */}
            {Array.from({ length: yLabels.length }).flatMap((_, y) =>
              Array.from({ length: xLabels.length }).map((_, x) => {
                const cell = lookup.values.get(y * xLabels.length + x);
                const fill = cell
                  ? colorForValue(cell.value, lookup.min, lookup.max, tokens)
                  : tokens.surfaceBackground;
                const key = cellKey(x, y);
                return (
                  <rect
                    key={key}
                    x={matrixLeft + cellWidth * x}
                    y={matrixTop + cellHeight * y}
                    width={cellWidth}
                    height={cellHeight}
                    fill={fill}
                    fillOpacity={opacityFor(key)}
                    stroke={tokens.background}
                    strokeWidth={1}
                    style={{ cursor: cell ? "pointer" : "default", transition: "fill-opacity 150ms ease" }}
                    onMouseEnter={cell ? (e) => handleCellEnter(cell, e) : undefined}
                    onMouseMove={cell ? handleCellMove : undefined}
                    onMouseLeave={cell ? handleCellLeave : undefined}
                    onClick={cell ? () => toggleSelection(key) : undefined}
                  />
                );
              }),
            )}

            {/* x-axis title */}
            {xlabel && (
              <text
                x={matrixLeft + (cellWidth * xLabels.length) / 2}
                y={totalHeight - 4}
                fill={tokens.textSecondary}
                fontSize={tokens.fontSize.label}
                fontFamily={tokens.fontFamily}
                textAnchor="middle"
              >
                {xlabel}
              </text>
            )}
          </svg>
        )}

        {tooltip && (
          <div
            style={{
              position: "fixed",
              top: tooltip.pageY + 12,
              left: tooltip.pageX + 12,
              background: tokens.tooltipBackground,
              border: `1px solid ${tokens.tooltipBorder}`,
              borderRadius: tokens.borderRadius,
              color: tokens.tooltipText,
              fontSize: tokens.fontSize.tooltip,
              fontFamily: tokens.fontFamily,
              padding: "6px 10px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 600 }}>
              {yLabels[tooltip.cell.y]} · {xLabels[tooltip.cell.x]}
            </div>
            <div>{NUMBER_FMT.format(tooltip.cell.value)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="sigil-root sigil-empty">
      <h2 className="sigil-title">{title}</h2>
      <p>No data to display.</p>
    </div>
  );
}
