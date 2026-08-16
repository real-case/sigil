// Accessible names for chart canvases.
//
// A screen reader reaches a chart's <svg> before any mark inside it, so this is
// the sentence that decides whether the chart is worth exploring. Every widget
// says the same three things in the same order — what the payload calls it,
// what kind of chart it is, and how much is in it:
//
//   "Revenue by quarter — bar chart, 4 bars"
//
// Never hardcode the first part. It comes from the payload, because that is the
// only part that tells one chart apart from another in the same conversation.

/** "1 row" / "7 rows" — pass `plural` where adding "s" is wrong. */
export function countOf(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** `title` from the payload, `kind` of chart, `detail` about its size. */
export function chartLabel(title: string, kind: string, detail: string): string {
  return `${title} — ${kind}, ${detail}`;
}
