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
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { EmptyState } from "../shared/EmptyState.js";
import { toCsv, copyText, copySvgAsPng } from "../shared/export-utils.js";

const DIMMED_OPACITY = 0.28;
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
  return datum.color ?? tokens.series[index % tokens.series.length]!;
}

export function BarChartView({ payload }: { payload: BarChartPayload }) {
  const tokens = useTheme();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, data, orientation, xlabel, ylabel } = payload;
  const isHorizontal = orientation === "horizontal";

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
    await copySvgAsPng(svg as SVGSVGElement, "bar-chart", tokens.surfaces.bg);
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

  const tickStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: tokens.typography.scale.tick.fontSize,
    letterSpacing: `${tokens.typography.scale.tick.letterSpacing}em`,
    textTransform: "uppercase" as const,
    fill: tokens.texts.muted,
  };

  const axisLabelStyle = {
    fill: tokens.texts.secondary,
    fontSize: tokens.typography.scale.label.fontSize,
    fontFamily: tokens.typography.family.sans,
    textAnchor: "middle" as const,
  };

  const cursorFill = "color-mix(in oklab, var(--sigil-series-0) 8%, transparent)";

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
          <BarChart
            data={data}
            layout={isHorizontal ? "vertical" : "horizontal"}
            margin={{
              top: 16,
              right: 16,
              bottom: xlabel ? 32 : 8,
              left: ylabel && !isHorizontal ? 24 : 8,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.chartLines.grid} />
            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  tick={tickStyle}
                  stroke={tokens.chartLines.axis}
                  height={xlabel ? 48 : 30}
                  label={
                    xlabel
                      ? {
                          value: xlabel,
                          position: "insideBottom",
                          offset: 0,
                          textAnchor: "middle",
                          style: axisLabelStyle,
                        }
                      : undefined
                  }
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={horizontalYAxisWidth + (ylabel ? 20 : 0)}
                  tick={tickStyle}
                  stroke={tokens.chartLines.axis}
                  tickFormatter={(v: string) => truncateLabel(v, HORIZONTAL_LABEL_MAX)}
                  interval={0}
                  label={
                    ylabel
                      ? {
                          value: ylabel,
                          angle: -90,
                          position: "insideLeft",
                          textAnchor: "middle",
                          style: axisLabelStyle,
                        }
                      : undefined
                  }
                />
              </>
            ) : (
              <>
                <XAxis
                  type="category"
                  dataKey="label"
                  tick={tickStyle}
                  stroke={tokens.chartLines.axis}
                  interval={0}
                  height={needsRotation ? (xlabel ? 80 : 64) : xlabel ? 48 : 30}
                  angle={needsRotation ? -30 : 0}
                  textAnchor={needsRotation ? "end" : "middle"}
                  label={
                    xlabel
                      ? {
                          value: xlabel,
                          position: "insideBottom",
                          offset: 0,
                          textAnchor: "middle",
                          style: axisLabelStyle,
                        }
                      : undefined
                  }
                />
                <YAxis
                  type="number"
                  tick={tickStyle}
                  stroke={tokens.chartLines.axis}
                  width={ylabel ? 64 : 48}
                  label={
                    ylabel
                      ? {
                          value: ylabel,
                          angle: -90,
                          position: "insideLeft",
                          textAnchor: "middle",
                          style: axisLabelStyle,
                        }
                      : undefined
                  }
                />
              </>
            )}
            {hasMixedSign && (
              <ReferenceLine
                {...(isHorizontal ? { x: 0 } : { y: 0 })}
                stroke={tokens.chartLines.axis}
                strokeWidth={1.5}
              />
            )}
            <Tooltip
              cursor={{ fill: cursorFill }}
              content={(props) => (
                <SigilTooltip
                  active={props.active}
                  label={props.label as string | number | undefined}
                  payload={
                    props.payload?.map((p) => ({
                      color: typeof p.color === "string" ? p.color : undefined,
                      name: typeof p.name === "string" ? p.name : undefined,
                      dataKey: p.dataKey as string | number | undefined,
                      value: p.value as number | string | undefined,
                    }))
                  }
                  hideLabel={false}
                />
              )}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((datum, i) => (
                <Cell
                  key={datum.label}
                  fill={colorFor(datum, i, tokens)}
                  fillOpacity={opacityFor(datum.label)}
                  onClick={() => toggleSelection(datum.label)}
                  style={{
                    cursor: "pointer",
                    transition: `fill-opacity var(--sigil-duration-fast) var(--sigil-easing-standard)`,
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

