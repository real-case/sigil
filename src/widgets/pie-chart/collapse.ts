import type { PieDatum } from "../../shared/payloads.js";

export interface PieDisplaySlice extends PieDatum {
  /** Index into the original payload data; -1 for the synthetic Other. */
  origIndex: number;
  /** Present only on the synthetic Other slice. */
  isOther?: true;
  /** How many source slices the Other aggregates (only on Other). */
  otherCount?: number;
}

export const DEFAULT_MAX_SEGMENTS = 5;

/**
 * Clamp an arbitrary payload value to a usable cap: integer >= 2, falling back
 * to the default for non-finite input. Shared by the reducer and the View (the
 * "Show top N" label) so the two can never disagree — dashboard tile payloads
 * bypass the widget guard, so out-of-range values do reach this code.
 */
export function normalizeMaxSegments(value: number | undefined): number {
  return Number.isFinite(value as number)
    ? Math.max(2, Math.floor(value as number))
    : DEFAULT_MAX_SEGMENTS;
}

/**
 * Collapse a pie payload's slices to at most `maxSegments` display slices:
 * the top `maxSegments - 1` by value (kept in original payload order) plus a
 * trailing synthetic "Other" slice aggregating the remainder. Ties at the
 * boundary keep the earlier payload entry. A tail summing to zero or negative
 * is kept as-is — the Other slice then behaves like any zero/negative-value
 * slice. Visual only: callers keep exporting the raw data. Pure — never
 * mutates `data`.
 */
export function collapsePieData(
  data: readonly PieDatum[],
  maxSegments?: number,
): { display: PieDisplaySlice[]; isCollapsed: boolean } {
  const cap = normalizeMaxSegments(maxSegments);
  if (data.length <= cap) {
    return {
      display: data.map((d, i) => ({ ...d, origIndex: i })),
      isCollapsed: false,
    };
  }

  const ranked = [...data.keys()].sort(
    (a, b) => data[b]!.value - data[a]!.value || a - b,
  );
  const kept = new Set(ranked.slice(0, cap - 1));

  const display: PieDisplaySlice[] = [];
  let otherSum = 0;
  let otherCount = 0;
  data.forEach((d, i) => {
    if (kept.has(i)) {
      display.push({ ...d, origIndex: i });
    } else {
      otherSum += d.value;
      otherCount += 1;
    }
  });
  display.push({
    label: "Other",
    value: otherSum,
    origIndex: -1,
    isOther: true,
    otherCount,
  });

  return { display, isCollapsed: true };
}
