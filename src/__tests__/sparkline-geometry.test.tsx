// Byte-identity pins for the sparkline consolidation.
//
// Item 3 of the composition program asks for one geometry module with both call
// sites as thin wrappers, and is explicit that "rendered output must stay
// byte-identical for both consumers — this is a refactor, not a redesign".
// These expectations were captured from the two implementations BEFORE they
// were replaced, so they say what the old code drew, not what the new code
// happens to draw.
//
// They also record that the two were never the same geometry. Compare `flat`:
// the table puts a rangeless series on the midline (y = 8.00 of 16), the stat
// panel puts it on the bottom inset (y = 26.00 of 28), because its old
// `range = max - min || 1` worked out that way. Both are preserved. Whether the
// second is right is a live question, deliberately not settled here.

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { sparkPoints } from "../widgets/table/cells.js";
import { StatPanelView } from "../widgets/stat-panel/StatPanelView.js";

const SERIES: Record<string, number[]> = {
  rising: [1, 2, 3, 4, 5],
  falling: [9, 4, 2],
  flat: [5, 5, 5],
  twoPoint: [0, 10],
  negatives: [-3, 0, 7, -1],
  fractional: [1.5, 2.25, 1.75],
  large: [1000000.0, 2000000.0, 1500000.0],
  zeros: [0, 0, 0, 0],
};

const TABLE_BEFORE: Record<string, string> = {
    rising: "2.00,15.00 15.00,11.50 28.00,8.00 41.00,4.50 54.00,1.00",
    falling: "2.00,1.00 28.00,11.00 54.00,15.00",
    flat: "2.00,8.00 28.00,8.00 54.00,8.00",
    twoPoint: "2.00,15.00 54.00,1.00",
    negatives: "2.00,15.00 19.33,10.80 36.67,1.00 54.00,12.20",
    fractional: "2.00,15.00 28.00,1.00 54.00,10.33",
    large: "2.00,15.00 28.00,1.00 54.00,8.00",
    zeros: "2.00,8.00 19.33,8.00 36.67,8.00 54.00,8.00",
};

const STAT_PANEL_BEFORE: Record<string, string[]> = {
    rising: [
      "M 2.00,28 L 2.00,26.00 L 26.00,20.00 L 50.00,14.00 L 74.00,8.00 L 98.00,2.00 L 98.00,28 Z",
      "M 2.00,26.00 L 26.00,20.00 L 50.00,14.00 L 74.00,8.00 L 98.00,2.00",
    ],
    falling: [
      "M 2.00,28 L 2.00,2.00 L 50.00,19.14 L 98.00,26.00 L 98.00,28 Z",
      "M 2.00,2.00 L 50.00,19.14 L 98.00,26.00",
    ],
    flat: [
      "M 2.00,28 L 2.00,26.00 L 50.00,26.00 L 98.00,26.00 L 98.00,28 Z",
      "M 2.00,26.00 L 50.00,26.00 L 98.00,26.00",
    ],
    twoPoint: [
      "M 2.00,28 L 2.00,26.00 L 98.00,2.00 L 98.00,28 Z",
      "M 2.00,26.00 L 98.00,2.00",
    ],
    negatives: [
      "M 2.00,28 L 2.00,26.00 L 34.00,18.80 L 66.00,2.00 L 98.00,21.20 L 98.00,28 Z",
      "M 2.00,26.00 L 34.00,18.80 L 66.00,2.00 L 98.00,21.20",
    ],
    fractional: [
      "M 2.00,28 L 2.00,26.00 L 50.00,2.00 L 98.00,18.00 L 98.00,28 Z",
      "M 2.00,26.00 L 50.00,2.00 L 98.00,18.00",
    ],
    large: [
      "M 2.00,28 L 2.00,26.00 L 50.00,2.00 L 98.00,14.00 L 98.00,28 Z",
      "M 2.00,26.00 L 50.00,2.00 L 98.00,14.00",
    ],
    zeros: [
      "M 2.00,28 L 2.00,26.00 L 34.00,26.00 L 66.00,26.00 L 98.00,26.00 L 98.00,28 Z",
      "M 2.00,26.00 L 34.00,26.00 L 66.00,26.00 L 98.00,26.00",
    ],
};

/** The card's two sparkline paths. The status icon's glyph has no space after
 * its first M, which is what separates it from a generated path. */
const sparkPaths = (values: number[]): string[] => {
  const html = renderToString(
    <StatPanelView payload={{ title: "T", items: [{ label: "M", value: 1, trend: values }] }} />,
  );
  return [...html.matchAll(/<path d="([^"]*)"/g)]
    .map((m) => m[1]!)
    .filter((d) => d.startsWith("M "));
};

describe("table sparkline geometry is unchanged", () => {
  for (const [name, values] of Object.entries(SERIES)) {
    it(`${name}`, () => {
      expect(sparkPoints(values)).toBe(TABLE_BEFORE[name]);
    });
  }
});

describe("stat-panel sparkline geometry is unchanged", () => {
  for (const [name, values] of Object.entries(SERIES)) {
    it(`${name}`, () => {
      expect(sparkPaths(values)).toEqual(STAT_PANEL_BEFORE[name]);
    });
  }
});

describe("the two conventions differ, on purpose", () => {
  it("a flat series sits on the midline in the table and on the floor in the card", () => {
    // Pin the divergence itself, so consolidating it later is a deliberate act
    // with a failing test attached rather than a silent visual change.
    expect(sparkPoints([5, 5, 5])).toBe("2.00,8.00 28.00,8.00 54.00,8.00");
    expect(sparkPaths([5, 5, 5])[1]).toBe("M 2.00,26.00 L 50.00,26.00 L 98.00,26.00");
  });
});
