import type { Orientation, PieVariant } from "../../shared/payloads.js";

/**
 * Accessible names for the six Recharts-rendered charts.
 *
 * Recharts draws its `<svg>` itself, inside `<ResponsiveContainer>`, so there
 * is no tag in our source to hang an `aria-label` on and `noSvgWithoutTitle`
 * can never fire on these widgets — the gap was invisible to the linter, not
 * absent. Passing `aria-label` as a prop on the chart component closes it:
 * Recharts filters chart props through `svgPropertiesNoEvents`, which keeps
 * every `aria-*` key, and spreads the survivors onto the `<svg>` (its
 * `Surface`), not onto the wrapper `<div>`.
 *
 * Its `accessibilityLayer` prop is a different thing and does not substitute:
 * it sets `role="application"` and `tabIndex={0}` (already the default in
 * Recharts 3 for every chart here except Treemap) and supplies no name at all.
 *
 * None of these names carry `role="img"`: it would prune the bars, slices and
 * nodes below out of the accessibility tree, and on five of the six those marks
 * are already reachable through the accessibility layer's arrow keys.
 *
 * The builders live here rather than inline in each view because the test
 * environment is `node` — a template literal inside JSX cannot be pinned, and
 * six sites phrasing "1 series" six different ways is exactly what a shared
 * module prevents. The phrasing matches the hand-written `<svg>` labels in
 * HeatmapView and MapView: `title — kind, shape`.
 */

/** `3 bars`, `1 bar`. Pass `plural` for anything -s does not cover. */
export function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

const label = (title: string, kind: string, ...shape: string[]): string =>
  `${title} — ${kind}, ${shape.join(", ")}`;

export function barChartLabel(
  title: string,
  bars: number,
  orientation: Orientation,
): string {
  const kind = orientation === "horizontal" ? "horizontal bar chart" : "bar chart";
  return label(title, kind, count(bars, "bar"));
}

export function lineChartLabel(
  title: string,
  series: number,
  points: number,
): string {
  // "series" is its own plural; the naive -s would read "1 seriess".
  return label(title, "line chart", count(series, "series", "series"), count(points, "point"));
}

export function pieChartLabel(
  title: string,
  slices: number,
  variant: PieVariant,
): string {
  // Counts the slices actually drawn, so a collapsed "Other" reads as the one
  // slice it is on screen rather than the several it stands for.
  return label(title, variant === "pie" ? "pie chart" : "donut chart", count(slices, "slice"));
}

export function scatterChartLabel(
  title: string,
  series: number,
  points: number,
): string {
  return label(
    title,
    "scatter chart",
    count(series, "series", "series"),
    count(points, "point"),
  );
}

export function sankeyLabel(title: string, nodes: number, links: number): string {
  return label(title, "sankey diagram", count(nodes, "node"), count(links, "flow"));
}

export function treemapLabel(title: string, leaves: number, groups: number): string {
  // Groups are the tiles you see but cannot select; naming them separates the
  // hierarchy from the leaf count, which a flat treemap collapses to nothing.
  return groups > 0
    ? label(title, "treemap", count(leaves, "leaf", "leaves"), count(groups, "group"))
    : label(title, "treemap", count(leaves, "leaf", "leaves"));
}
