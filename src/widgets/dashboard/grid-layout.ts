// Pure layout maths for the dashboard grid (plan task 4.1, program item 8).
//
// `columns` in the payload is a MAXIMUM. The effective count steps down as the
// dashboard's own box narrows — measured on the dashboard container, not the
// viewport, because a dashboard can itself sit in a narrow host panel — so no
// tile is squeezed below MIN_TILE_WIDTH. A tile's colSpan is clamped to the
// effective count, so a `colSpan: 2` tile in a one-column layout fills the row
// instead of creating an implicit second column that overflows the card.
//
// This is done in TypeScript rather than with CSS container queries alone
// because the span clamp needs the effective column count as a number, which
// CSS cannot hand from the grid to its items.

/** Narrowest a tile may get before the grid drops a column. */
export const MIN_TILE_WIDTH = 300;
/** Default and ceiling for `columns`. */
export const DEFAULT_COLUMNS = 2;
export const MAX_COLUMNS = 4;

/** The declared maximum, clamped to 1..4 (2 when omitted). */
export function declaredColumns(columns: number | undefined): number {
  const n = Math.floor(columns ?? DEFAULT_COLUMNS);
  return Math.max(1, Math.min(MAX_COLUMNS, Number.isFinite(n) ? n : DEFAULT_COLUMNS));
}

/**
 * How many columns fit in `width` px with `gap` px between them, never more
 * than the declared maximum and never fewer than one. A width of 0 means "not
 * measured yet" and keeps the declared count, so the first paint matches a
 * wide host and a narrow one corrects itself one frame later.
 */
export function effectiveColumns(columns: number | undefined, width: number, gap = 16): number {
  const max = declaredColumns(columns);
  if (!(width > 0)) return max;
  const fit = Math.floor((width + gap) / (MIN_TILE_WIDTH + gap));
  return Math.max(1, Math.min(max, fit));
}

/** A tile's span within `cols` effective columns. */
export function clampSpan(colSpan: number | undefined, cols: number): number {
  const n = Math.floor(colSpan ?? 1);
  return Math.max(1, Math.min(cols, Number.isFinite(n) ? n : 1));
}

/** "Source: X · As of Y" — the parts that are present, in that order. */
export function provenanceLine(p: { source?: string; asOf?: string }): string | null {
  const parts = [
    ...(p.source ? [`Source: ${p.source}`] : []),
    ...(p.asOf ? [`As of ${p.asOf}`] : []),
  ];
  return parts.length > 0 ? parts.join(" · ") : null;
}
