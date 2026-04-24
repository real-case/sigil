import { useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PieChartPayload } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { toCsv, copyText, copySvgAsPng } from "../shared/export-utils.js";

const DIMMED_OPACITY = 0.28;
const CELL_TRANSITION = "fill-opacity 150ms ease";
const LABEL_PERCENT_THRESHOLD = 0.04; // hide labels for slices under 4%

function colorFor(
  datum: { color?: string },
  index: number,
  tokens: ChartDesignTokens,
): string {
  return datum.color ?? tokens.seriesColors[index % tokens.seriesColors.length]!;
}

function renderSliceLabel(entry: { percent?: number }): string {
  const p = entry.percent ?? 0;
  if (p < LABEL_PERCENT_THRESHOLD) return "";
  return `${Math.round(p * 100)}%`;
}

export function PieChartView({ payload }: { payload: PieChartPayload }) {
  const tokens = useTheme();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, data, variant } = payload;

  if (data.length === 0) {
    return <EmptyState title={title} />;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) {
    return <EmptyState title={title} note="All slice values are zero." />;
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
    await copySvgAsPng(svg as SVGSVGElement, "pie-chart", tokens.background);
  };

  const isDonut = variant === "donut";
  const toggleSelection = (label: string) =>
    setSelectedLabel((prev) => (prev === label ? null : label));
  const opacityFor = (label: string) =>
    selectedLabel === null || selectedLabel === label ? 1 : DIMMED_OPACITY;

  const tooltipStyle = {
    background: tokens.tooltipBackground,
    border: `1px solid ${tokens.tooltipBorder}`,
    borderRadius: tokens.borderRadius,
    color: tokens.tooltipText,
    fontSize: tokens.fontSize.tooltip,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  };

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
          <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius="75%"
              innerRadius={isDonut ? "50%" : 0}
              paddingAngle={isDonut ? 2 : 0}
              isAnimationActive={false}
              label={renderSliceLabel}
              labelLine={false}
              stroke={tokens.background}
              strokeWidth={2}
            >
              {data.map((datum, i) => (
                <Cell
                  key={datum.label}
                  fill={colorFor(datum, i, tokens)}
                  fillOpacity={opacityFor(datum.label)}
                  onClick={() => toggleSelection(datum.label)}
                  style={{ cursor: "pointer", transition: CELL_TRANSITION }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: tokens.tooltipText, fontWeight: 600 }}
              itemStyle={{ color: tokens.tooltipText }}
              formatter={(value: number, name: string) => {
                const pct = ((value / total) * 100).toFixed(1);
                return [`${value} (${pct}%)`, name];
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: tokens.fontSize.label,
                color: tokens.textSecondary,
              }}
              onClick={(entry) => {
                const label = typeof entry.value === "string" ? entry.value : null;
                if (label) toggleSelection(label);
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EmptyState({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mcpcharts-root mcpcharts-empty">
      <h2 className="mcpcharts-title">{title}</h2>
      <p>{note ?? "No data to display."}</p>
    </div>
  );
}
