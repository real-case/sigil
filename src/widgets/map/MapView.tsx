import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { MapPayload, MapRegionDatum } from "../../shared/payloads.js";
import { useTheme } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { EmptyState } from "../shared/EmptyState.js";
import { ColorScaleLegend, intensityAlpha } from "../shared/color-scale.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";
import {
  WORLD_FEATURES,
  resolveFeature,
  countryName,
  type CountryFeature,
} from "./geo.js";

const NUMBER_FMT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });
// Natural Earth (Antarctica dropped) has a land aspect close to 1.9:1.
const MAP_ASPECT = 0.52;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 520;

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
  name: string;
  value: number;
  pageX: number;
  pageY: number;
}

interface Resolved {
  byFeature: Map<CountryFeature, number>;
  min: number;
  max: number;
  unmatched: number;
}

function resolveData(data: MapRegionDatum[]): Resolved {
  const byFeature = new Map<CountryFeature, number>();
  let min = Infinity;
  let max = -Infinity;
  let unmatched = 0;
  for (const d of data) {
    const f = resolveFeature(d.id);
    if (!f) {
      unmatched++;
      continue;
    }
    if (!Number.isFinite(d.value)) continue;
    // Last write wins if two data entries map to the same country.
    byFeature.set(f, d.value);
    if (d.value < min) min = d.value;
    if (d.value > max) max = d.value;
  }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 0;
  }
  return { byFeature, min, max, unmatched };
}

export function MapView({ payload }: { payload: MapPayload }) {
  const tokens = useTheme();
  const [selected, setSelected] = useState<CountryFeature | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const { title, data, valueLabel } = payload;

  const resolved = useMemo(() => resolveData(data), [data]);

  const height = Math.round(
    Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, width * MAP_ASPECT)),
  );

  // Fit a fixed projection to the full world so the map extent stays stable
  // regardless of which countries carry data.
  const pathFor = useMemo(() => {
    if (width <= 0) return null;
    const projection = geoNaturalEarth1().fitSize([width, height], {
      type: "FeatureCollection",
      features: WORLD_FEATURES as CountryFeature[],
    } as unknown as GeoPermissibleObjects);
    const gen = geoPath(projection);
    return (f: CountryFeature) => gen(f as unknown as GeoPermissibleObjects) ?? "";
  }, [width, height]);

  if (data.length === 0 || resolved.byFeature.size === 0) {
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
        <EmptyState
          title="No regions to display"
          description={
            data.length === 0
              ? "The payload was empty."
              : "No country ids matched. Use ISO 3166-1 alpha-3 codes (e.g. USA, DEU) or common names."
          }
        />
      </div>
    );
  }

  const seriesHue = tokens.series[0]!;
  // No-data land: a neutral tint that reads as land over the widget background,
  // and the base that data fills composite the series hue over.
  const land = `color-mix(in oklab, ${tokens.texts.muted} 16%, ${tokens.surfaces.bg})`;
  const ocean = tokens.surfaces.bg;

  const fillFor = (f: CountryFeature): string => {
    const value = resolved.byFeature.get(f);
    if (value === undefined) return land;
    const alpha = intensityAlpha(value, resolved.min, resolved.max);
    return `color-mix(in oklab, ${seriesHue} ${(alpha * 100).toFixed(1)}%, ${land})`;
  };

  const copyCsv = () => {
    const header = ["Country", valueLabel ?? "Value"];
    const body: CsvCell[][] = data.map((d) => {
      const f = resolveFeature(d.id);
      return [d.label ?? (f ? countryName(f) : d.id), d.value];
    });
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Map SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "map", ocean);
  };

  const showTooltip = (f: CountryFeature, value: number, ev: React.MouseEvent) => {
    setTooltip({
      name: countryName(f),
      value,
      pageX: ev.clientX,
      pageY: ev.clientY,
    });
  };
  const moveTooltip = (ev: React.MouseEvent) =>
    setTooltip((prev) =>
      prev ? { ...prev, pageX: ev.clientX, pageY: ev.clientY } : prev,
    );
  const hideTooltip = () => setTooltip(null);

  const toggleSelection = (f: CountryFeature) =>
    setSelected((prev) => (prev === f ? null : f));

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
        {width > 0 && pathFor && (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ display: "block", maxWidth: "100%" }}
          >
            {WORLD_FEATURES.map((f, i) => {
              const value = resolved.byFeature.get(f);
              const hasData = value !== undefined;
              const isSelected = selected === f;
              const dimmed = selected !== null && !isSelected;
              return (
                <path
                  key={i}
                  d={pathFor(f)}
                  fill={fillFor(f)}
                  fillOpacity={dimmed ? 0.28 : 1}
                  stroke={isSelected ? tokens.texts.primary : ocean}
                  strokeWidth={isSelected ? 1.2 : 0.6}
                  strokeLinejoin="round"
                  style={{
                    cursor: hasData ? "pointer" : "default",
                    transition:
                      "fill-opacity var(--sigil-duration-fast) var(--sigil-easing-standard)",
                  }}
                  onMouseEnter={
                    hasData ? (e) => showTooltip(f, value, e) : undefined
                  }
                  onMouseMove={hasData ? moveTooltip : undefined}
                  onMouseLeave={hasData ? hideTooltip : undefined}
                  onClick={hasData ? () => toggleSelection(f) : undefined}
                />
              );
            })}
          </svg>
        )}

        {width > 0 && resolved.max > resolved.min && (
          <ColorScaleLegend
            min={resolved.min}
            max={resolved.max}
            hue={seriesHue}
            tokens={tokens}
            baseColor={land}
          />
        )}

        {resolved.unmatched > 0 && (
          <div
            style={{
              textAlign: "center",
              paddingTop: 8,
              color: tokens.texts.muted,
              fontFamily: tokens.typography.family.sans,
              fontSize: tokens.typography.scale.label.fontSize,
            }}
          >
            {resolved.unmatched} region{resolved.unmatched === 1 ? "" : "s"} not
            matched
          </div>
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
              minWidth: 160,
              boxShadow: "var(--sigil-shadow-mid)",
              pointerEvents: "none",
              zIndex: 10,
              animation:
                "sigil-tooltip-enter var(--sigil-duration-base) var(--sigil-easing-standard)",
            }}
          >
            <div style={{ color: "var(--sigil-text-secondary)", marginBottom: 4 }}>
              {tooltip.name}
            </div>
            <div
              style={{
                fontFamily: "var(--sigil-font-value-sm-family)",
                fontSize: "var(--sigil-font-value-sm-size)",
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {NUMBER_FMT.format(tooltip.value)}
            </div>
            {valueLabel && (
              <div
                style={{
                  color: "var(--sigil-text-muted)",
                  fontSize: tokens.typography.scale.tick.fontSize,
                  marginTop: 2,
                }}
              >
                {valueLabel}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
