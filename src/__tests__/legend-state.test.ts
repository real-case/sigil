// The legend focus/mute rules, and a pin that the four charts still use them.
//
// The rules are tested as functions rather than through the hook because this
// suite runs under `environment: "node"` — there is no DOM to render a hook
// into, and `renderToString` cannot drive the state it produces. So the hook is
// a thin useState wrapper and everything it decides lives in `legendOpacity`
// and `toggleMuted`, where it is directly reachable.
//
// The source pin covers what unit tests cannot: which opacity each widget
// passes. Swapping 0.2 for 0.32 is a visual change that compiles, passes every
// other test, and shows up only to the eye.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  legendOpacity,
  toggleMuted,
  MUTED_OPACITY,
} from "../widgets/shared/legend-state.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDGETS = join(HERE, "..", "widgets");

const none = { focused: null, muted: new Set<number>() };

describe("legendOpacity", () => {
  it("leaves everything at full opacity when nothing is selected", () => {
    expect(legendOpacity(0, none, 0.2)).toBe(1);
    expect(legendOpacity(7, none, 0.32)).toBe(1);
  });

  it("dims the others while one is focused, and not the focused one", () => {
    const s = { focused: 1, muted: new Set<number>() };
    expect(legendOpacity(1, s, 0.2)).toBe(1);
    expect(legendOpacity(0, s, 0.2)).toBe(0.2);
    expect(legendOpacity(0, s, 0.32)).toBe(0.32);
  });

  it("dims a muted series regardless of focus", () => {
    const s = { focused: null, muted: new Set([2]) };
    expect(legendOpacity(2, s, 0.2)).toBe(MUTED_OPACITY);
    expect(legendOpacity(3, s, 0.2)).toBe(1);
  });

  it("lets muting win over focus, both ways round", () => {
    // The case worth stating: a series the viewer switched off stays off while
    // the pointer wanders onto it, rather than brightening under the cursor.
    expect(legendOpacity(2, { focused: 2, muted: new Set([2]) }, 0.2)).toBe(MUTED_OPACITY);
    expect(legendOpacity(2, { focused: 5, muted: new Set([2]) }, 0.2)).toBe(MUTED_OPACITY);
  });
});

describe("toggleMuted", () => {
  it("adds, then removes", () => {
    const once = toggleMuted(new Set<number>(), 1);
    expect([...once]).toEqual([1]);
    expect([...toggleMuted(once, 1)]).toEqual([]);
  });

  it("never mutates the set it is given", () => {
    // The views hold this in state; mutating in place would skip a re-render.
    const before = new Set([1]);
    const after = toggleMuted(before, 2);
    expect([...before]).toEqual([1]);
    expect([...after]).toEqual([1, 2]);
  });
});

describe("every legend-bearing chart uses the shared state", () => {
  // 0.2 where the marks are thin — lines, points; 0.32 where they are filled
  // areas. A real difference, kept as a parameter rather than normalised.
  const EXPECTED: Array<[file: string, unfocused: number]> = [
    ["line-chart/LineChartView.tsx", 0.2],
    ["scatter-chart/ScatterChartView.tsx", 0.2],
    ["bar-chart/BarChartView.tsx", 0.32],
    ["pie-chart/PieChartView.tsx", 0.32],
  ];

  const sourceOf = (file: string) => readFileSync(join(WIDGETS, file), "utf8");

  it.each(EXPECTED)("%s passes unfocusedOpacity %s", (file, unfocused) => {
    const match = sourceOf(file).match(/useLegendState\(\{\s*unfocusedOpacity:\s*([\d.]+)\s*\}\)/);
    expect(match, `${file} does not call useLegendState`).not.toBeNull();
    expect(Number(match![1])).toBe(unfocused);
  });

  it.each(EXPECTED)("%s keeps no state machine of its own", (file) => {
    const source = sourceOf(file);
    expect(source, "re-declares the unfocused constant").not.toMatch(/const UNFOCUSED_OPACITY/);
    expect(source, "re-declares opacityFor").not.toMatch(/const opacityFor = /);
    expect(source, "re-declares toggleMute").not.toMatch(/const toggleMute = /);
  });
});
