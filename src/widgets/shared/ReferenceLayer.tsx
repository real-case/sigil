// Recharts half of the shared reference layer (see reference-layer.ts for the
// colour and placement rules). Exposed as plain functions returning element
// arrays rather than as a component: they are spliced straight into a chart's
// children, which is where Recharts looks for its reference elements.
//
// Reference marks and annotations are context, not data: they take no click,
// no tab stop and no tooltip, so they add nothing to the chart's keyboard
// sequence. Their labels are SVG text and land in the accessibility tree.

import type { ReactElement } from "react";
import { ReferenceArea, ReferenceLine } from "recharts";
import type { LineAnnotation, ReferenceMark } from "../../shared/payloads.js";
import type { ChartDesignTokens } from "./theme.js";
import {
  BAND_FILL_OPACITY,
  REFERENCE_DASH,
  referenceLabelPosition,
  referenceToneColors,
  screenAxisOf,
} from "./reference-layer.js";

export interface ReferenceMarkOptions {
  /** True for a horizontal bar chart: payload "y" (values) runs along screen x. */
  swapped?: boolean;
  /** Value-axis id, for charts that declare one (bar series mode). */
  valueAxisId?: string;
  /** Prefix for React keys, when one chart renders two layers. */
  keyPrefix?: string;
}

// A halo in the surface colour keeps a label legible where it crosses a bar,
// a line or a band.
function labelStyle(tokens: ChartDesignTokens, fill: string) {
  return {
    fill,
    fontFamily: tokens.typography.family.sans,
    fontSize: 11.5,
    fontWeight: 600,
    stroke: tokens.surfaces.surface,
    strokeWidth: 3,
    strokeLinejoin: "round" as const,
    paintOrder: "stroke" as const,
  };
}

/**
 * Extra top margin a chart needs for its reference labels: a value-axis line
 * at the top of the domain prints its label above the plot.
 */
export function referenceHeadroom(marks: readonly ReferenceMark[] | undefined): number {
  return marks?.some((m) => m.label) ? 14 : 0;
}

export function referenceMarks(
  marks: readonly ReferenceMark[] | undefined,
  tokens: ChartDesignTokens,
  { swapped = false, valueAxisId, keyPrefix = "ref" }: ReferenceMarkOptions = {},
): ReactElement[] {
  if (!marks?.length) return [];
  return marks.map((m, i) => {
    const key = `${keyPrefix}-${i}`;
    const colors = referenceToneColors(tokens, m.tone);
    const screen = screenAxisOf(m.axis, swapped);
    const label = m.label
      ? {
          value: m.label,
          position: referenceLabelPosition(screen, m.kind),
          offset: 6,
          style: labelStyle(tokens, colors.text),
        }
      : undefined;
    // The value axis carries the id; a category axis in these charts never does.
    const axisIds =
      valueAxisId && m.axis === "y"
        ? screen === "y"
          ? { yAxisId: valueAxisId }
          : { xAxisId: valueAxisId }
        : {};
    // A target above every bar is the most common reason to draw one, so a
    // value-axis mark widens the domain rather than vanishing off the top.
    const ifOverflow = m.axis === "y" ? ("extendDomain" as const) : ("hidden" as const);

    if (m.kind === "line") {
      return (
        <ReferenceLine
          key={key}
          {...(screen === "y" ? { y: m.value } : { x: m.value })}
          {...axisIds}
          stroke={colors.stroke}
          strokeWidth={1.5}
          strokeDasharray={REFERENCE_DASH}
          ifOverflow={ifOverflow}
          label={label}
        />
      );
    }
    return (
      <ReferenceArea
        key={key}
        {...(screen === "y" ? { y1: m.from, y2: m.to } : { x1: m.from, x2: m.to })}
        {...axisIds}
        fill={colors.fill}
        fillOpacity={BAND_FILL_OPACITY}
        stroke={colors.stroke}
        strokeOpacity={0.35}
        strokeDasharray={REFERENCE_DASH}
        ifOverflow={ifOverflow}
        label={label}
      />
    );
  });
}

/**
 * Event annotations on the x axis of a line chart: a solid hairline at `x`
 * or a lightly shaded region `x`..`x2`, labelled at the top. Neutral by
 * design — an annotation says *when*, the data says *what*.
 */
export function annotationMarks(
  annotations: readonly LineAnnotation[] | undefined,
  tokens: ChartDesignTokens,
): ReactElement[] {
  if (!annotations?.length) return [];
  const colors = referenceToneColors(tokens, "neutral");
  return annotations.map((a, i) => {
    const key = `annotation-${i}`;
    // Alternate label rows so two nearby events don't print over each other.
    const offset = i % 2 === 0 ? 6 : 20;
    const label = {
      value: a.label,
      position: "insideTopLeft" as const,
      offset,
      style: labelStyle(tokens, colors.text),
    };
    if (a.x2 !== undefined) {
      return (
        <ReferenceArea
          key={key}
          x1={a.x}
          x2={a.x2}
          fill={colors.fill}
          fillOpacity={BAND_FILL_OPACITY}
          ifOverflow="hidden"
          label={label}
        />
      );
    }
    return (
      <ReferenceLine
        key={key}
        x={a.x}
        stroke={colors.stroke}
        strokeOpacity={0.6}
        strokeWidth={1}
        ifOverflow="hidden"
        label={label}
      />
    );
  });
}
