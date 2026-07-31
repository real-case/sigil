export interface SeriesEndIndices {
  /** First merged-row index where the series has a value; -1 if none. */
  first: number;
  /** Last such index; -1 if none. */
  last: number;
}

/**
 * First/last row anchors per series name over the merged rows. mergeSeries
 * unions x values across series, so a series may open or close with gaps —
 * an anchor is the first/last row where `row[name] != null`, mirroring the
 * dot renderer's null handling.
 *
 * Anchors are indices into the FULL merged rows. Recharts derives the dot
 * callback's index from its displayed window, so if a Brush/panorama is ever
 * added to the line chart, both anchors must be offset by the window start.
 */
export function seriesEndIndices(
  rows: ReadonlyArray<Record<string, unknown>>,
  seriesNames: readonly string[],
): SeriesEndIndices[] {
  return seriesNames.map((name) => {
    let first = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]![name] != null) {
        first = i;
        break;
      }
    }
    if (first === -1) return { first: -1, last: -1 };
    let last = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i]![name] != null) {
        last = i;
        break;
      }
    }
    return { first, last };
  });
}

export type DotRole = "end" | "start" | "sparse" | "none";

/**
 * Decision order for the line dot renderer. End wins whenever the index hits
 * the last anchor — including a single-point series where first === last — so
 * the current-value accent always survives. Start fires only at the first
 * anchor; any other point of a sparse series keeps its quiet marker. -1
 * anchors (a series with no values) never match.
 */
export function dotRole(args: {
  index: number;
  first: number;
  last: number;
  sparse: boolean;
}): DotRole {
  const { index, first, last, sparse } = args;
  if (last >= 0 && index === last) return "end";
  if (first >= 0 && index === first) return "start";
  return sparse ? "sparse" : "none";
}
