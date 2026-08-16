// Six of the eight chart canvases are drawn by Recharts inside
// <ResponsiveContainer>, so no <svg> tag appears in our source and Biome's
// `noSvgWithoutTitle` can never fire on them: a widget that ships with no
// accessible name is invisible to the linter. Hence the source pin below —
// it is the only gate that will catch that regression.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chartLabel, countOf } from "../widgets/shared/chart-label.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDGETS_DIR = join(HERE, "..", "widgets");

describe("countOf", () => {
  it("keeps the singular at exactly one", () => {
    expect(countOf(1, "bar")).toBe("1 bar");
    expect(countOf(0, "bar")).toBe("0 bars");
    expect(countOf(2, "bar")).toBe("2 bars");
  });

  it("takes an explicit plural where adding -s is wrong", () => {
    // The two that bite: "series" is its own plural, and the map's region noun
    // is data-driven — a naive -s produced "3 countrys" before this existed.
    expect(countOf(2, "series", "series")).toBe("2 series");
    expect(countOf(3, "country", "countries")).toBe("3 countries");
    expect(countOf(1, "country", "countries")).toBe("1 country");
  });
});

describe("chartLabel", () => {
  it("puts the payload title first, unaltered", () => {
    // Titles carry their own punctuation; the separator must not mangle one.
    expect(chartLabel("Q3 — EMEA", "bar chart", countOf(2, "bar"))).toBe(
      "Q3 — EMEA — bar chart, 2 bars",
    );
  });

  it("reads as title, kind, then size", () => {
    expect(chartLabel("Latency", "line chart", "6 series over 20 points")).toBe(
      "Latency — line chart, 6 series over 20 points",
    );
  });
});

describe("every chart canvas keeps an accessible name", () => {
  // The element each view must name, as written in its source. For a Recharts
  // view the prop has to sit on the chart component itself — Recharts filters
  // chart props through `svgPropertiesNoEvents` onto the <svg> it renders, so
  // on <ResponsiveContainer> or the wrapper <div> it would be dropped.
  const VIEWS: Array<[file: string, tag: string]> = [
    ["bar-chart/BarChartView.tsx", "BarChart"],
    ["line-chart/LineChartView.tsx", "AreaChart"],
    ["pie-chart/PieChartView.tsx", "PieChart"],
    ["scatter-chart/ScatterChartView.tsx", "ScatterChart"],
    ["sankey/SankeyView.tsx", "Sankey"],
    ["treemap/TreemapView.tsx", "Treemap"],
    ["heatmap/HeatmapView.tsx", "svg"],
    ["map/MapView.tsx", "svg"],
  ];

  const sourceOf = (file: string) =>
    readFileSync(join(WIDGETS_DIR, file), "utf8");

  // These views *discuss* role="img" in comments explaining why they don't use
  // it, so a source pin has to read code only. Whole-line comments and JSX
  // {/* … */} blocks cover every such mention; leaving trailing `//` comments
  // in place keeps the strip from eating the rest of a line after a URL.
  const codeOf = (file: string) =>
    sourceOf(file)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it.each(VIEWS)("%s names its <%s>", (file, tag) => {
    const source = sourceOf(file);
    const labelled = new RegExp(`<${tag}\\b[^>]*?\\saria-label=\\{`, "s");
    expect(labelled.test(source), `<${tag}> has no aria-label prop`).toBe(true);
  });

  it.each(VIEWS)("%s builds that name from the payload", (file) => {
    // Hardcoding it would defeat the point: in a dashboard of three charts the
    // title is the only thing telling them apart.
    expect(sourceOf(file), `${file} should use chartLabel()`).toContain(
      "chartLabel(",
    );
  });

  it("gives no chart canvas role=img", () => {
    // role="img" prunes the marks below it out of the accessibility tree, and
    // on these the marks are the part worth reaching. The stat-panel sparkline
    // is the deliberate exception and is not in this list.
    for (const [file] of VIEWS) {
      expect(codeOf(file), `${file} must not carry role="img"`).not.toMatch(
        /role=["{]['"]?img/,
      );
    }
  });
});
