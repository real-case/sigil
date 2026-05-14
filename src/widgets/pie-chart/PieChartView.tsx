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
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { EmptyState } from "../shared/EmptyState.js";
import { toCsv, copyText, copySvgAsPng } from "../shared/export-utils.js";

const DIMMED_OPACITY = 0.5;
const LABEL_PERCENT_THRESHOLD = 0.04;

function colorFor(
  datum: { color?: string },
  index: number,
  tokens: ChartDesignTokens,
): string {
  return datum.color ?? tokens.series[index % tokens.series.length]!;
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
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) {
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
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
  const toggleSelection = (label: string) =>
    setSelectedLabel((prev) => (prev === label ? null : label));
  const opacityFor = (label: string) =>
    selectedLabel === null || selectedLabel === label ? 1 : DIMMED_OPACITY;

  return (
    <div className="sigil-root">
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
        <Toolbar>
          <ToolbarButton label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </div>
      <div className="sigil-canvas" ref={canvasRef}>
        <ResponsiveContainer width="100%" height={360}>
          <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius="75%"
              innerRadius={isDonut ? "60%" : 0}
              paddingAngle={isDonut ? 2 : 0}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
              label={renderSliceLabel}
              labelLine={false}
              stroke={tokens.surfaces.bg}
              strokeWidth={2}
            >
              {data.map((datum, i) => (
                <Cell
                  key={datum.label}
                  fill={colorFor(datum, i, tokens)}
                  fillOpacity={opacityFor(datum.label)}
                  onClick={() => toggleSelection(datum.label)}
                  style={{
                    cursor: "pointer",
                    transition:
                      "fill-opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <SigilTooltip
                  active={props.active}
                  hideLabel
                  payload={
                    props.payload?.map((p) => ({
                      color: typeof p.color === "string" ? p.color : undefined,
                      name: typeof p.name === "string" ? p.name : undefined,
                      dataKey: p.dataKey as string | number | undefined,
                      value: p.value as number | string | undefined,
                    }))
                  }
                  formatValue={(value) => {
                    const n = typeof value === "number" ? value : Number(value);
                    if (!Number.isFinite(n)) return String(value);
                    const pct = ((n / total) * 100).toFixed(1);
                    return `${n} (${pct}%)`;
                  }}
                />
              )}
            />
            <Legend
              wrapperStyle={{
                fontFamily: tokens.typography.family.sans,
                fontSize: tokens.typography.scale.label.fontSize,
                color: tokens.texts.secondary,
                paddingTop: 8,
              }}
              iconType="circle"
              iconSize={9}
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
