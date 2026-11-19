// Keyboard drill-down for the Recharts widgets (bar, line, pie).
//
// Recharts' accessibility layer already makes each chart one keyboard stop:
// focusing the <svg> shows the tooltip, and the arrow keys move it from
// category to category. What it lacks is an "activate" key. This module adds
// one without a second focus sequence: a probe rendered inside the chart
// remembers which datum the tooltip is on and where, and Enter/Space on the
// chart opens the drill-down menu for that datum — the keyboard twin of a
// click on it. The custom-SVG widgets (heatmap, funnel) get the same through
// roving-focus.ts instead.

import { useEffect, useRef, type RefObject } from "react";
import { useActiveTooltipCoordinate, useActiveTooltipDataPoints } from "recharts";

export interface ActiveDatum {
  /** The data entry the tooltip is on, as Recharts holds it. */
  datum: unknown;
  /** Its position in chart coordinates. */
  x: number;
  y: number;
}

/**
 * Rendered as a chart child so the hooks see the chart's context; draws
 * nothing. Writes into a ref, not state: nothing re-renders on hover.
 */
export function ActiveDatumProbe({ into }: { into: RefObject<ActiveDatum | null> }) {
  const points = useActiveTooltipDataPoints();
  const coordinate = useActiveTooltipCoordinate();
  const datum = points?.[0];
  useEffect(() => {
    into.current =
      datum !== undefined && coordinate ? { datum, x: coordinate.x, y: coordinate.y } : null;
  }, [into, datum, coordinate]);
  return null;
}

/**
 * Enter/Space on the focused chart inside `container` calls `activate` with
 * the tooltip's datum and a viewport point beside it. Keys from anything other
 * than the chart surface itself (a legend button, the menu) are left alone.
 *
 * A native listener rather than an `onKeyDown` prop: the container is a plain
 * <div>, and the keyboard target is Recharts' own focusable <svg> inside it.
 * Pass `activate = null` to listen for nothing.
 */
export function useChartKeyActivation(
  container: RefObject<HTMLElement | null>,
  probe: RefObject<ActiveDatum | null>,
  activate: ((datum: unknown, at: { x: number; y: number }) => void) | null,
): void {
  const latest = useRef(activate);
  latest.current = activate;
  const enabled = activate !== null;
  // No dependency list on purpose: the container can mount after the first
  // render (an empty state first, data later), and re-attaching one listener
  // per render costs nothing worth a stale one.
  useEffect(() => {
    const el = container.current;
    if (!el || !enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof SVGSVGElement)) return;
      const active = probe.current;
      const run = latest.current;
      if (!active || !run) return;
      event.preventDefault();
      const box = target.getBoundingClientRect();
      run(active.datum, { x: box.left + active.x, y: box.top + active.y });
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  });
}
