// The Recharts-rendered charts draw their <svg> inside <ResponsiveContainer>,
// so no <svg> tag appears in our source and Biome's `noSvgWithoutTitle` can
// never fire on them — losing the accessible name here is invisible to the
// linter. Hence two halves: exact phrasings for the builders, and a source pin
// that each view still hands its chart component an `aria-label`.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  count,
  barChartLabel,
  lineChartLabel,
  pieChartLabel,
  scatterChartLabel,
  sankeyLabel,
  treemapLabel,
} from "../widgets/shared/chart-a11y.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..");

describe("count", () => {
  it("keeps the singular at exactly one", () => {
    expect(count(1, "bar")).toBe("1 bar");
    expect(count(0, "bar")).toBe("0 bars");
    expect(count(2, "bar")).toBe("2 bars");
  });

  it("takes an explicit plural for words -s does not cover", () => {
    expect(count(1, "leaf", "leaves")).toBe("1 leaf");
    expect(count(3, "leaf", "leaves")).toBe("3 leaves");
    // "series" is its own plural; the naive -s would read "2 seriess".
    expect(count(2, "series", "series")).toBe("2 series");
  });
});

describe("chart labels", () => {
  it("names a bar chart by orientation", () => {
    expect(barChartLabel("Revenue", 4, "vertical")).toBe(
      "Revenue — bar chart, 4 bars",
    );
    expect(barChartLabel("Revenue", 1, "horizontal")).toBe(
      "Revenue — horizontal bar chart, 1 bar",
    );
  });

  it("names a line chart by series and points", () => {
    expect(lineChartLabel("Traffic", 3, 120)).toBe(
      "Traffic — line chart, 3 series, 120 points",
    );
    expect(lineChartLabel("Traffic", 1, 1)).toBe(
      "Traffic — line chart, 1 series, 1 point",
    );
  });

  it("names a pie chart by variant", () => {
    expect(pieChartLabel("Split", 5, "donut")).toBe("Split — donut chart, 5 slices");
    expect(pieChartLabel("Split", 5, "pie")).toBe("Split — pie chart, 5 slices");
  });

  it("names a scatter chart by series and points", () => {
    expect(scatterChartLabel("Fit", 2, 40)).toBe(
      "Fit — scatter chart, 2 series, 40 points",
    );
  });

  it("names a sankey by nodes and flows", () => {
    expect(sankeyLabel("Funnel", 6, 7)).toBe("Funnel — sankey diagram, 6 nodes, 7 flows");
    expect(sankeyLabel("Funnel", 2, 1)).toBe("Funnel — sankey diagram, 2 nodes, 1 flow");
  });

  it("names a treemap, mentioning groups only when the tree has any", () => {
    expect(treemapLabel("Spend", 12, 3)).toBe("Spend — treemap, 12 leaves, 3 groups");
    // A flat treemap has no hierarchy to describe.
    expect(treemapLabel("Spend", 12, 0)).toBe("Spend — treemap, 12 leaves");
  });

  it("puts the payload title first, unaltered", () => {
    expect(barChartLabel("Q3 — EMEA", 2, "vertical")).toBe(
      "Q3 — EMEA — bar chart, 2 bars",
    );
  });
});

describe("the Recharts views keep an aria-label on the chart", () => {
  // Each view's chart component, as written in its source. The name has to
  // land on the <svg> Recharts renders, and it only does so when the prop sits
  // on this component — Recharts filters chart props through
  // `svgPropertiesNoEvents` onto its `Surface`. On the wrapper <div>, or on
  // <ResponsiveContainer>, it is dropped.
  const VIEWS: Array<[file: string, chartTag: string, builder: string]> = [
    ["bar-chart/BarChartView.tsx", "BarChart", "barChartLabel"],
    ["line-chart/LineChartView.tsx", "AreaChart", "lineChartLabel"],
    ["pie-chart/PieChartView.tsx", "PieChart", "pieChartLabel"],
    ["scatter-chart/ScatterChartView.tsx", "ScatterChart", "scatterChartLabel"],
    ["sankey/SankeyView.tsx", "Sankey", "sankeyLabel"],
    ["treemap/TreemapView.tsx", "Treemap", "treemapLabel"],
  ];

  it.each(VIEWS)("%s labels its <%s>", (file, chartTag, builder) => {
    const source = readFileSync(join(SRC, "widgets", file), "utf8");

    // The opening tag through to its first `>` that is not inside a brace —
    // enough to hold the props, not so much that it swallows the children.
    const opening = new RegExp(`<${chartTag}\\b[^>]*?\\saria-label=\\{`, "s");
    expect(opening.test(source), `<${chartTag}> has no aria-label prop`).toBe(true);
    expect(source, `${file} should build its name with ${builder}`).toContain(builder);
  });

  it("no Recharts chart is given role=img", () => {
    // role="img" prunes the marks below it out of the accessibility tree, and
    // on every one of these the marks are the part worth reaching.
    for (const [file] of VIEWS) {
      const source = readFileSync(join(SRC, "widgets", file), "utf8");
      expect(source, `${file} must not carry role="img"`).not.toMatch(
        /role=["{]['"]?img/,
      );
    }
  });
});
