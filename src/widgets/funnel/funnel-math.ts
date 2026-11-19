// The arithmetic of a funnel, apart from its drawing so it can be tested.
//
// Two conversions per stage, because they answer different questions:
// "of everyone who started, how many got here" (from first) and "of everyone
// at the stage before, how many moved on" (from previous). The second is what
// locates a leak; the first is what a funnel's headline number is.
//
// Degenerate input is drawn, never hidden:
// - A zero denominator yields `null`, not NaN or Infinity — the view prints a
//   dash. A funnel that starts at 0 has no conversions at all.
// - A stage larger than the one before it (a re-entry, a mis-ordered step, a
//   second source joining mid-funnel) keeps its real value and is flagged
//   `grew`, so the chart can say so instead of silently capping it.

export interface FunnelStepInput {
  label: string;
  value: number;
}

export interface FunnelRow {
  label: string;
  value: number;
  /** value / first stage's value; null when the first stage is 0. */
  ofFirst: number | null;
  /** value / previous stage's value; null on the first stage or after a 0. */
  ofPrevious: number | null;
  /** previous − value, when positive; 0 otherwise (and on the first stage). */
  lost: number;
  /** True when this stage is larger than the one before it. */
  grew: boolean;
}

export interface FunnelLayout {
  rows: FunnelRow[];
  /** Largest value of any stage — the bar scale's 100 %. */
  max: number;
  /**
   * Index of the stage with the worst step conversion (lowest `ofPrevious`
   * among stages that lost anyone), or −1 when no stage lost anyone. Ties go
   * to the earlier stage, where the leak starts.
   */
  biggestDrop: number;
}

const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

export function funnelLayout(steps: readonly FunnelStepInput[]): FunnelLayout {
  const first = steps[0]?.value ?? 0;
  let max = 0;
  let biggestDrop = -1;
  let worst = Infinity;

  const rows = steps.map((step, i): FunnelRow => {
    const value = Number.isFinite(step.value) ? Math.max(0, step.value) : 0;
    if (value > max) max = value;
    if (i === 0) {
      return { label: step.label, value, ofFirst: ratio(value, first), ofPrevious: null, lost: 0, grew: false };
    }
    const prev = Math.max(0, steps[i - 1]!.value);
    const ofPrevious = ratio(value, prev);
    const lost = prev > value ? prev - value : 0;
    if (lost > 0 && ofPrevious !== null && ofPrevious < worst) {
      worst = ofPrevious;
      biggestDrop = i;
    }
    return {
      label: step.label,
      value,
      ofFirst: ratio(value, first),
      ofPrevious,
      lost,
      grew: value > prev,
    };
  });

  return { rows, max, biggestDrop };
}

/** 0.4123 → "41.2%", null → "—". One decimal, or none at 100 % and above. */
export function fmtConversion(r: number | null): string {
  if (r === null) return "—";
  const pct = r * 100;
  return pct >= 100 || pct === 0 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
}
