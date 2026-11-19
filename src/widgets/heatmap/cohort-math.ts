// Pure maths behind the heatmap's cohort mode. No React — pinned by
// cohort-math.test.ts.
//
// A cohort table is triangular: the newest cohort has lived through the
// fewest periods, so the cells it has not reached yet are absent, not zero.
// The average row honours that. Each period's average is taken over the
// cohorts that have a value there and nothing else, so a young cohort never
// drags a late period towards 0.
//
// With sizes the average is weighted: a 10 000-user cohort at 40 % and a
// 100-user cohort at 90 % average to ~40.5 %, which is what the business
// retained, not 65 %. Without sizes it falls back to a plain mean, and the
// view says so in the row label.

export interface CohortCell {
  x: number;
  y: number;
  value: number;
}

export interface CohortAverage {
  /** Average per column, or null where no cohort reached that period. */
  values: (number | null)[];
  /** True when every contributing cohort had a positive size. */
  weighted: boolean;
}

export function cohortAverage(
  cells: readonly CohortCell[],
  columns: number,
  rows: number,
  sizes?: readonly number[],
): CohortAverage {
  // A size list that does not cover every row (or sums to nothing) cannot
  // weight anything honestly, so the mean is unweighted rather than partial.
  const weighted =
    sizes !== undefined &&
    sizes.length === rows &&
    sizes.every((s) => Number.isFinite(s) && s >= 0) &&
    sizes.some((s) => s > 0);

  const sum = new Array<number>(columns).fill(0);
  const weight = new Array<number>(columns).fill(0);
  // Last value wins for a repeated (x, y), matching the matrix lookup.
  const seen = new Map<number, CohortCell>();
  for (const c of cells) {
    if (!Number.isFinite(c.value)) continue;
    if (c.x < 0 || c.x >= columns || c.y < 0 || c.y >= rows) continue;
    seen.set(c.y * columns + c.x, c);
  }
  for (const c of seen.values()) {
    const w = weighted ? sizes![c.y]! : 1;
    sum[c.x]! += c.value * w;
    weight[c.x]! += w;
  }
  return {
    values: sum.map((s, x) => (weight[x]! > 0 ? s / weight[x]! : null)),
    weighted,
  };
}

const PCT_FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** 42.5 → "42.5%"; cohort cells are already percentages. */
export function fmtPercent(value: number): string {
  return `${PCT_FMT.format(value)}%`;
}

const SIZE_FMT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 12 400 → "12.4K"; the size column is narrow. */
export function fmtCohortSize(value: number): string {
  return SIZE_FMT.format(value);
}
