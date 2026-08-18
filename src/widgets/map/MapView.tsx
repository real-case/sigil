import { useEffect, useMemo, useRef, useState } from "react";
import { geoPath, type GeoPermissibleObjects } from "d3-geo";
import type {
  MapPayload,
  MapPoint,
  MapRegionDatum,
} from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { EmptyState } from "../shared/EmptyState.js";
import { ColorScaleLegend, intensityAlpha } from "../shared/color-scale.js";
import { useRovingFocus } from "../shared/roving-focus.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";
import { scopeGeo, regionName, type RegionFeature, type ScopeGeo } from "./geo.js";

const NUMBER_FMT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 520;
const BUBBLE_R_MIN = 3;
const BUBBLE_R_MAX = 28;

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
  name: string;
  value: number;
  pageX: number;
  pageY: number;
}

// ----- Choropleth data resolution --------------------------------------------

interface Resolved {
  byFeature: Map<RegionFeature, number>;
  min: number;
  max: number;
  unmatched: number;
}

function resolveData(data: MapRegionDatum[], geo: ScopeGeo): Resolved {
  const byFeature = new Map<RegionFeature, number>();
  let min = Infinity;
  let max = -Infinity;
  let unmatched = 0;
  for (const d of data) {
    const f = geo.resolve(d.id);
    if (!f) {
      unmatched++;
      continue;
    }
    if (!Number.isFinite(d.value)) continue;
    // Last write wins if two data entries map to the same region.
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

// ----- Bubble size legend ----------------------------------------------------

function niceNum(v: number): number {
  if (v <= 0) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * p;
}

function BubbleSizeLegend({
  max,
  radiusFor,
  hue,
  tokens,
}: {
  max: number;
  radiusFor: (v: number) => number;
  hue: string;
  tokens: ChartDesignTokens;
}) {
  const refs = Array.from(new Set([niceNum(max), niceNum(max / 2), niceNum(max / 6)]))
    .filter((v) => v > 0)
    .sort((a, b) => b - a)
    .slice(0, 3);
  if (refs.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 20,
        paddingTop: 14,
      }}
    >
      {refs.map((v) => {
        const d = radiusFor(v) * 2;
        return (
          <div
            key={v}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: d,
                height: d,
                borderRadius: "50%",
                background: `color-mix(in oklab, ${hue} 45%, transparent)`,
                border: `1px solid ${hue}`,
              }}
            />
            <span
              style={{
                fontFamily: tokens.typography.family.mono,
                fontSize: tokens.typography.scale.tick.fontSize,
                color: tokens.texts.muted,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {NUMBER_FMT.format(v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MapView({ payload }: { payload: MapPayload }) {
  const tokens = useTheme();
  const [selected, setSelected] = useState<RegionFeature | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const { title, valueLabel } = payload;

  const isBubble = payload.variant === "bubble";
  const data = payload.data ?? [];
  const geo = scopeGeo(payload.scope ?? "world");
  const resolved = useMemo(() => resolveData(data, geo), [data, geo]);

  const height = Math.round(
    Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, width * geo.aspect)),
  );

  // Fit the scope's projection to its full feature set so the map extent stays
  // stable. Exposes both a path generator (regions/land) and a point projector
  // (bubble coordinates).
  const geoMemo = useMemo(() => {
    if (width <= 0) return null;
    const projection = geo.projection().fitSize([width, height], {
      type: "FeatureCollection",
      features: geo.features as RegionFeature[],
    } as unknown as GeoPermissibleObjects);
    const gen = geoPath(projection);
    return {
      drawPath: (f: RegionFeature) => gen(f as unknown as GeoPermissibleObjects) ?? "",
      project: (lon: number, lat: number) => projection([lon, lat]) ?? null,
    };
  }, [width, height, geo]);

  const bubbles = useMemo(() => {
    if (!isBubble || !geoMemo) return null;
    const placed: { p: MapPoint; x: number; y: number }[] = [];
    let max = 0;
    for (const p of payload.points ?? []) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || !Number.isFinite(p.value)) {
        continue;
      }
      const xy = geoMemo.project(p.lon, p.lat);
      if (!xy) continue;
      placed.push({ p, x: xy[0], y: xy[1] });
      if (p.value > max) max = p.value;
    }
    // Largest first so smaller markers draw on top and stay clickable.
    placed.sort((a, b) => b.p.value - a.p.value);
    return { placed, max };
  }, [isBubble, geoMemo, payload.points]);

  // The keyboard walks only the regions that carry a value. Unlike a heatmap's
  // matrix there is no grid to leave holes in, and stepping through 150-odd
  // blank countries to reach the dozen with data would not be navigation.
  const dataRegions = useMemo(
    () => (isBubble ? [] : geo.features.filter((f) => resolved.byFeature.has(f))),
    [isBubble, geo.features, resolved.byFeature],
  );
  const roving = useRovingFocus<SVGGraphicsElement>({
    count: isBubble ? (bubbles?.placed.length ?? 0) : dataRegions.length,
    onActivate: (index) => {
      // Bubbles are read-only markers — there is nothing for Enter to toggle.
      if (isBubble) return;
      const f = dataRegions[index];
      if (f) setSelected((prev) => (prev === f ? null : f));
    },
  });

  // ----- Empty states (width-independent) -----
  if (isBubble ? (payload.points ?? []).length === 0 : data.length === 0 || resolved.byFeature.size === 0) {
    const description = isBubble
      ? "The payload had no points."
      : data.length === 0
        ? "The payload was empty."
        : geo.regionLabel === "State"
          ? "No state ids matched. Use USPS codes (e.g. CA, TX), full names, or FIPS."
          : "No country ids matched. Use ISO 3166-1 alpha-3 codes (e.g. USA, DEU) or common names.";
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
        <EmptyState title="No regions to display" description={description} />
      </div>
    );
  }

  const seriesHue = tokens.series[0]!;
  // No-data land: a neutral tint that reads as land over the widget background,
  // and the base that choropleth fills composite the series hue over.
  const land = `color-mix(in oklab, ${tokens.texts.muted} 16%, ${tokens.surfaces.bg})`;
  const ocean = tokens.surfaces.bg;

  const fillFor = (f: RegionFeature): string => {
    const value = resolved.byFeature.get(f);
    if (value === undefined) return land;
    const alpha = intensityAlpha(value, resolved.min, resolved.max);
    return `color-mix(in oklab, ${seriesHue} ${(alpha * 100).toFixed(1)}%, ${land})`;
  };

  const radiusFor = (v: number): number => {
    const max = bubbles?.max ?? 0;
    if (max <= 0) return BUBBLE_R_MIN;
    return BUBBLE_R_MIN + (BUBBLE_R_MAX - BUBBLE_R_MIN) * Math.sqrt(Math.max(0, v) / max);
  };

  const unplotted = isBubble && bubbles ? (payload.points ?? []).length - bubbles.placed.length : 0;

  const copyCsv = () => {
    if (isBubble) {
      const header = ["Label", "Lat", "Lon", valueLabel ?? "Value"];
      const body: CsvCell[][] = (payload.points ?? []).map((p) => [
        p.label ?? "",
        p.lat,
        p.lon,
        p.value,
      ]);
      return copyText(toCsv(header, body));
    }
    const header = [geo.regionLabel, valueLabel ?? "Value"];
    const body: CsvCell[][] = data.map((d) => {
      const f = geo.resolve(d.id);
      return [d.label ?? (f ? regionName(f) : d.id), d.value];
    });
    return copyText(toCsv(header, body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Map SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "map", ocean);
  };

  const showTooltip = (name: string, value: number, ev: React.MouseEvent) => {
    setTooltip({ name, value, pageX: ev.clientX, pageY: ev.clientY });
  };
  const moveTooltip = (ev: React.MouseEvent) =>
    setTooltip((prev) =>
      prev ? { ...prev, pageX: ev.clientX, pageY: ev.clientY } : prev,
    );
  const hideTooltip = () => setTooltip(null);
  // Keyboard focus has no pointer to anchor to, so the tooltip hangs off the
  // focused mark itself — the same readout a hovering mouse gets.
  const showTooltipAt = (name: string, value: number, el: SVGGraphicsElement) => {
    const box = el.getBoundingClientRect();
    setTooltip({ name, value, pageX: box.left + box.width / 2, pageY: box.bottom });
  };

  const toggleSelection = (f: RegionFeature) =>
    setSelected((prev) => (prev === f ? null : f));

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
        {width > 0 && geoMemo && (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ display: "block", maxWidth: "100%" }}
            // A bare aria-label rather than role="img": role="img" would prune
            // the regions below out of the accessibility tree, and they are the
            // part worth reaching.
            aria-label={
              isBubble
                ? chartLabel(
                    title,
                    "bubble map",
                    countOf(bubbles?.placed.length ?? 0, "point"),
                  )
                : chartLabel(
                    title,
                    "choropleth map",
                    `${countOf(
                      dataRegions.length,
                      geo.regionLabel.toLowerCase(),
                      geo.regionLabelPlural.toLowerCase(),
                    )} with data`,
                  )
            }
          >
            {/* Land with nothing to say: painted first, inert, out of the
                listbox below so the keyboard sequence stays meaningful. */}
            {(isBubble
              ? geo.features
              : geo.features.filter((f) => !resolved.byFeature.has(f))
            ).map((f, i) => (
              <path
                key={i}
                d={geoMemo.drawPath(f)}
                fill={isBubble ? land : fillFor(f)}
                stroke={ocean}
                strokeWidth={0.6}
                strokeLinejoin="round"
              />
            ))}

            {!isBubble && (
              <g role="listbox" aria-label={`${geo.regionLabelPlural} with data`}>
                {dataRegions.map((f, i) => {
                  const value = resolved.byFeature.get(f)!;
                  const isSelected = selected === f;
                  const dimmed = selected !== null && !isSelected;
                  const { ref, tabIndex, onFocus, onKeyDown } = roving.itemProps(i);
                  return (
                    <path
                      key={i}
                      ref={ref}
                      className="sigil-mark"
                      role="option"
                      tabIndex={tabIndex}
                      aria-selected={isSelected}
                      aria-label={`${regionName(f)}: ${NUMBER_FMT.format(value)}`}
                      d={geoMemo.drawPath(f)}
                      fill={fillFor(f)}
                      fillOpacity={dimmed ? 0.28 : 1}
                      stroke={isSelected ? tokens.texts.primary : ocean}
                      strokeWidth={isSelected ? 1.2 : 0.6}
                      strokeLinejoin="round"
                      style={{
                        cursor: "pointer",
                        transition:
                          "fill-opacity var(--sigil-duration-fast) var(--sigil-easing-standard)",
                      }}
                      onKeyDown={onKeyDown}
                      onFocus={(e) => {
                        onFocus();
                        showTooltipAt(regionName(f), value, e.currentTarget);
                      }}
                      onBlur={hideTooltip}
                      onMouseEnter={(e) => showTooltip(regionName(f), value, e)}
                      onMouseMove={moveTooltip}
                      onMouseLeave={hideTooltip}
                      onClick={() => toggleSelection(f)}
                    />
                  );
                })}
              </g>
            )}

            {isBubble && bubbles && bubbles.placed.length > 0 && (
              <g role="listbox" aria-label="Plotted points">
                {bubbles.placed.map(({ p, x, y }, i) => {
                  const name = p.label ?? `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`;
                  const { ref, tabIndex, onFocus, onKeyDown } = roving.itemProps(i);
                  return (
                    <circle
                      key={i}
                      ref={ref}
                      className="sigil-mark"
                      role="option"
                      tabIndex={tabIndex}
                      aria-label={`${name}: ${NUMBER_FMT.format(p.value)}`}
                      cx={x}
                      cy={y}
                      r={radiusFor(p.value)}
                      fill={seriesHue}
                      fillOpacity={0.5}
                      stroke={seriesHue}
                      strokeWidth={1}
                      style={{ cursor: "pointer" }}
                      onKeyDown={onKeyDown}
                      onFocus={(e) => {
                        onFocus();
                        showTooltipAt(name, p.value, e.currentTarget);
                      }}
                      onBlur={hideTooltip}
                      onMouseEnter={(e) => showTooltip(name, p.value, e)}
                      onMouseMove={moveTooltip}
                      onMouseLeave={hideTooltip}
                    />
                  );
                })}
              </g>
            )}
          </svg>
        )}

        {width > 0 &&
          (isBubble
            ? bubbles && bubbles.max > 0 && (
                <BubbleSizeLegend
                  max={bubbles.max}
                  radiusFor={radiusFor}
                  hue={seriesHue}
                  tokens={tokens}
                />
              )
            : resolved.max > resolved.min && (
                <ColorScaleLegend
                  min={resolved.min}
                  max={resolved.max}
                  hue={seriesHue}
                  tokens={tokens}
                  baseColor={land}
                />
              ))}

        {(isBubble ? unplotted : resolved.unmatched) > 0 && (
          <div
            style={{
              textAlign: "center",
              paddingTop: 8,
              color: tokens.texts.muted,
              fontFamily: tokens.typography.family.sans,
              fontSize: tokens.typography.scale.label.fontSize,
            }}
          >
            {isBubble ? unplotted : resolved.unmatched}{" "}
            {isBubble ? "point" : "region"}
            {(isBubble ? unplotted : resolved.unmatched) === 1 ? "" : "s"}{" "}
            {isBubble ? "off the map" : "not matched"}
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
