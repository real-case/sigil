// A treemap draws two kinds of block: the leaves, which are the tab sequence,
// and the group rectangles their parents occupy, which are visible but not
// selectable. Naming only the leaves described less than half of a nested chart
// — "12 tiles" for a picture holding 12 tiles inside 4 groups.
//
// Tested here rather than through the rendered output because Recharts draws
// its <svg> inside <ResponsiveContainer>, which measures a DOM box: under this
// suite's `node` environment `renderToString(<TreemapView …/>)` emits no
// aria-label at all. chart-label.test.ts pins the prop's presence in source;
// this pins what the string says.

import { describe, it, expect } from "vitest";
import type { TreemapNode } from "../shared/payloads.js";
import { countGroups, treemapDetail } from "../widgets/treemap/TreemapView.js";

const leaf = (label: string, value = 1): TreemapNode => ({ label, value });
const group = (label: string, children: TreemapNode[]): TreemapNode => ({
  label,
  value: 0,
  children,
});

describe("countGroups", () => {
  it("counts nothing in a flat treemap", () => {
    expect(countGroups([leaf("a"), leaf("b")])).toBe(0);
  });

  it("counts a parent, not its leaves", () => {
    expect(countGroups([group("g", [leaf("a"), leaf("b")])])).toBe(1);
  });

  it("counts nested parents at every depth", () => {
    // Irregular nesting is legal — one branch deeper than its sibling — and the
    // count has to follow the payload rather than assume a uniform depth.
    const data = [
      group("top", [group("mid", [leaf("a")]), leaf("b")]),
      group("other", [leaf("c")]),
    ];
    expect(countGroups(data)).toBe(3);
  });

  it("treats an empty children array as a leaf", () => {
    // `children: []` reaches the guard as valid and Recharts lays it out as a
    // leaf, so counting it as a group would name a block nobody can see.
    expect(countGroups([{ label: "a", value: 1, children: [] }])).toBe(0);
  });
});

describe("treemapDetail", () => {
  it("says only the tile count when the treemap is flat", () => {
    expect(treemapDetail(4, 0)).toBe("4 tiles");
  });

  it("names the groups when there are any", () => {
    expect(treemapDetail(12, 4)).toBe("12 tiles in 4 groups");
  });

  it("gets both singulars right", () => {
    expect(treemapDetail(1, 1)).toBe("1 tile in 1 group");
  });
});
