// Secondary encoding: a second channel besides colour that tells series apart
// (plan task 4.7). Marker shapes for scatter, dash patterns for line.
//
// Colour stays the primary channel. These turn on when the payload asks for
// them (`shapes`, `patterns`, a per-series `shape` / `dash`) and always under
// forced colours, where the system paints every series in one colour. The
// legend draws the same glyph, so the key matches the marks.

import type { ReactNode } from "react";
import { MARKER_SHAPES, LINE_DASHES } from "../../shared/schemas.js";
import { SERIES_DASHES } from "./use-media-query.js";

export type MarkerShape = (typeof MARKER_SHAPES)[number];
export type LineDash = (typeof LINE_DASHES)[number];

/** Explicit shape, else the automatic one for slot `i` when enabled, else a circle. */
export function markerShape(i: number, explicit: MarkerShape | undefined, auto: boolean): MarkerShape {
  if (explicit) return explicit;
  return auto ? MARKER_SHAPES[i % MARKER_SHAPES.length]! : "circle";
}

const NAMED_DASHES: Record<LineDash, string | undefined> = {
  solid: undefined,
  dashed: "8 4",
  dotted: "2 4",
  "dash-dot": "12 4 2 4",
};

/** SVG dasharray for series `i`: explicit dash, else the automatic pattern when enabled. */
export function lineDash(i: number, explicit: LineDash | undefined, auto: boolean): string | undefined {
  if (explicit) return NAMED_DASHES[explicit];
  if (!auto) return undefined;
  const d = SERIES_DASHES[i % SERIES_DASHES.length];
  return d === "" ? undefined : d;
}

/** The path of `shape` centred on (cx, cy), r ≈ half its width. */
export function shapePath(shape: MarkerShape, cx: number, cy: number, r: number): string {
  switch (shape) {
    case "square":
      return `M ${cx - r * 0.85} ${cy - r * 0.85} h ${r * 1.7} v ${r * 1.7} h ${-r * 1.7} z`;
    case "triangle":
      return `M ${cx} ${cy - r} L ${cx + r} ${cy + r * 0.8} L ${cx - r} ${cy + r * 0.8} z`;
    case "diamond":
      return `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} z`;
    case "cross": {
      const t = r * 0.36;
      return `M ${cx - t} ${cy - r} h ${2 * t} v ${r - t} h ${r - t} v ${2 * t} h ${t - r} v ${r - t} h ${-2 * t} v ${t - r} h ${t - r} v ${-2 * t} h ${r - t} z`;
    }
    case "star": {
      const pts: string[] = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 === 0 ? r : r * 0.45;
        pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
      }
      return `M ${pts.join(" L ")} z`;
    }
    default:
      return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
  }
}

/** Legend glyph for a marker shape. */
export function ShapeGlyph({ shape, color }: { shape: MarkerShape; color: string }): ReactNode {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
      <path d={shapePath(shape, 7, 7, 5.5)} fill={color} />
    </svg>
  );
}

/** Legend glyph for a line pattern. */
export function DashGlyph({ dash, color }: { dash: string | undefined; color: string }): ReactNode {
  return (
    <svg width={22} height={14} viewBox="0 0 22 14" aria-hidden="true">
      <line x1={1} x2={21} y1={7} y2={7} stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeDasharray={dash} />
    </svg>
  );
}
