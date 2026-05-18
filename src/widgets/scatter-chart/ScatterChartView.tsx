import { useMemo, useRef, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  ScatterChartPayload,
  ScatterSeries,
} from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { ChartLegend } from "../shared/ChartLegend.js";
import { EmptyState } from "../shared/EmptyState.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const DIMMED_OPACITY = 0.2;
const POINT_RANGE: [number, number] = [40, 320];

function seriesColor(index: number, tokens: ChartDesignTokens): string {
  return tokens.series[index % tokens.series.length]!;
}

function hasSizeEncoding(series: ScatterSeries[]): boolean {
  return series.some((s) => s.data.some((d) => typeof d.size === "number"));
}

export function ScatterChartView({ payload }: { payload: ScatterChartPayload }) {
  const tokens = useTheme();
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, series, xlabel, ylabel } = payload;

  const totalPoints = useMemo(
    () => series.reduce((n, s) => n + s.data.length, 0),
    [series],
  );

  if (series.length === 0 || totalPoints === 0) {
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

  const sized = useMemo(() => hasSizeEncoding(series), [series]);

  const copyCsv = () => {
    const header = ["series", xlabel ?? "x", ylabel ?? "y", ...(sized ? ["size"] : [])];
    const body: CsvCell[][] = series.flatMap((s) =>
      s.data.map((d) => [s.name, d.x, d.y, ...(sized ? [d.size ?? ""] : [])]),
    );
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "scatter-chart", tokens.surfaces.bg);
  };

  const opacityFor = (name: string) =>
    selectedSeries === null || selectedSeries === name ? 1 : DIMMED_OPACITY;
  const toggleSelection = (name: string) =>
    setSelectedSeries((prev) => (prev === name ? null : name));

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
          <ScatterChart
            margin={{
              top: 16,
              right: 16,
              bottom: 8,
              left: ylabel ? 24 : 8,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.chartLines.grid} />
            <XAxis
              type="number"
              dataKey="x"
              name={xlabel ?? "x"}
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
              type="number"
              dataKey="y"
              name={ylabel ?? "y"}
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
            {sized && (
              <ZAxis type="number" dataKey="size" range={POINT_RANGE} name="size" />
            )}
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: tokens.chartLines.axis }}
              content={(props) => (
                <SigilTooltip
                  active={props.active}
                  label={undefined}
                  hideLabel
                  payload={
                    props.payload?.map((p) => ({
                      color: typeof p.color === "string" ? p.color : undefined,
                      name: typeof p.name === "string" ? p.name : undefined,
                      dataKey: p.dataKey as string | number | undefined,
                      value: p.value as number | string | undefined,
                    }))
                  }
                />
              )}
            />
            {series.map((s, i) => (
              <Scatter
                key={s.name}
                name={s.name}
                data={s.data}
                fill={seriesColor(i, tokens)}
                fillOpacity={opacityFor(s.name) * 0.7}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        <ChartLegend
          items={series.map((s, i) => ({
            name: s.name,
            color: seriesColor(i, tokens),
          }))}
          selected={selectedSeries}
          onToggle={toggleSelection}
        />
      </div>
    </div>
  );
}
