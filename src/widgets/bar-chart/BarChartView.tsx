import { useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { BarChartPayload } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { toCsv, copyText, copySvgAsPng } from "../shared/export-utils.js";

const DIMMED_OPACITY = 0.28;
const CELL_TRANSITION = "fill-opacity 150ms ease";
const ROTATE_AFTER_ITEMS = 6;
const ROTATE_AFTER_LABEL_LEN = 8;
const HORIZONTAL_LABEL_MAX = 16;
const HORIZONTAL_LABEL_WIDTH_BASE = 80;
const HORIZONTAL_LABEL_WIDTH_PER_CHAR = 6.5;

const truncateLabel = (s: string, max: number): string =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`;

function colorFor(
  datum: { color?: string },
  index: number,
  tokens: ChartDesignTokens,
): string {
  return datum.color ?? tokens.seriesColors[index % tokens.seriesColors.length]!;
}

export function BarChartView({ payload }: { payload: BarChartPayload }) {
  const tokens = useTheme();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, data, orientation, xlabel, ylabel } = payload;
  const isHorizontal = orientation === "horizontal";

  if (data.length === 0) {
    return <EmptyState title={title} />;
  }

  const copyCsv = () =>
    copyText(
      toCsv(
        [xlabel ?? "label", ylabel ?? "value"],
        data.map((d) => [d.label, d.value]),
      ),
    );

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "bar-chart", tokens.background);
  };

  const toggleSelection = (label: string) =>
    setSelectedLabel((prev) => (prev === label ? null : label));
  const opacityFor = (label: string) =>
    selectedLabel === null || selectedLabel === label ? 1 : DIMMED_OPACITY;

  const { needsRotation, hasMixedSign, horizontalYAxisWidth } = useMemo(() => {
    const longestLabel = data.reduce((m, d) => Math.max(m, d.label.length), 0);
    const anyNegative = data.some((d) => d.value < 0);
    const anyPositive = data.some((d) => d.value > 0);
    return {
      needsRotation:
        !isHorizontal &&
        (data.length > ROTATE_AFTER_ITEMS || longestLabel > ROTATE_AFTER_LABEL_LEN),
      hasMixedSign: anyNegative && anyPositive,
      horizontalYAxisWidth: Math.min(
        HORIZONTAL_LABEL_WIDTH_BASE +
          Math.min(longestLabel, HORIZONTAL_LABEL_MAX) * HORIZONTAL_LABEL_WIDTH_PER_CHAR,
        180,
      ),
    };
  }, [data, isHorizontal]);

  const axisStyle = { fontSize: tokens.fontSize.label, fill: tokens.textSecondary };
  const labelStyle = { fill: tokens.textSecondary, fontSize: tokens.fontSize.label };
  const tooltipStyle = {
    background: tokens.tooltipBackground,
    border: `1px solid ${tokens.tooltipBorder}`,
    borderRadius: tokens.borderRadius,
    color: tokens.tooltipText,
    fontSize: tokens.fontSize.tooltip,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  };
  const tooltipLabelStyle = { color: tokens.tooltipText, fontWeight: 600 };
  const tooltipItemStyle = { color: tokens.tooltipText };
  const cursorFill = hexWithAlpha(tokens.seriesColors[0]!, 0.08);

  return (
    <div className="mcpcharts-root">
      <div className="mcpcharts-header">
        <h2 className="mcpcharts-title">{title}</h2>
        <Toolbar>
          <ToolbarButton label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </div>
      <div className="mcpcharts-canvas" ref={canvasRef}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={isHorizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: 16, bottom: 24, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.gridLine} />
            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  tick={axisStyle}
                  stroke={tokens.axisLine}
                  label={
                    xlabel
                      ? { value: xlabel, position: "insideBottom", offset: -8, style: labelStyle }
                      : undefined
                  }
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={horizontalYAxisWidth}
                  tick={axisStyle}
                  stroke={tokens.axisLine}
                  tickFormatter={(v: string) => truncateLabel(v, HORIZONTAL_LABEL_MAX)}
                  interval={0}
                  label={
                    ylabel
                      ? { value: ylabel, angle: -90, position: "insideLeft", style: labelStyle }
                      : undefined
                  }
                />
              </>
            ) : (
              <>
                <XAxis
                  type="category"
                  dataKey="label"
                  tick={axisStyle}
                  stroke={tokens.axisLine}
                  interval={0}
                  height={needsRotation ? 64 : 30}
                  angle={needsRotation ? -30 : 0}
                  textAnchor={needsRotation ? "end" : "middle"}
                  label={
                    xlabel
                      ? { value: xlabel, position: "insideBottom", offset: -8, style: labelStyle }
                      : undefined
                  }
                />
                <YAxis
                  type="number"
                  tick={axisStyle}
                  stroke={tokens.axisLine}
                  label={
                    ylabel
                      ? { value: ylabel, angle: -90, position: "insideLeft", style: labelStyle }
                      : undefined
                  }
                />
              </>
            )}
            {hasMixedSign && (
              <ReferenceLine
                {...(isHorizontal ? { x: 0 } : { y: 0 })}
                stroke={tokens.axisLine}
                strokeWidth={1.5}
              />
            )}
            <Tooltip
              cursor={{ fill: cursorFill }}
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((datum, i) => (
                <Cell
                  key={datum.label}
                  fill={colorFor(datum, i, tokens)}
                  fillOpacity={opacityFor(datum.label)}
                  onClick={() => toggleSelection(datum.label)}
                  style={{ cursor: "pointer", transition: CELL_TRANSITION }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="mcpcharts-root mcpcharts-empty">
      <h2 className="mcpcharts-title">{title}</h2>
      <p>No data to display.</p>
    </div>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
