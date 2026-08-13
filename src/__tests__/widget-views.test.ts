// Pins for the seam the dashboard-tile-resilience change created. Both halves
// guard failures that no other gate can see: a widget missing from WIDGET_VIEWS
// now degrades to a per-tile card instead of failing loudly, and a guard module
// that reaches back to its App entry would drag `mountWidget` into the dashboard
// browser bundle — where `document` exists, so ten of them would fire on import
// and render into the dashboard's own root.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WIDGETS } from "../registry.js";
import { WIDGET_VIEWS, lookupWidgetView } from "../widgets/shared/widget-views.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..");

// Two ways to evade a naive pin, both covered here: moduleResolution is
// "Bundler", so a bare "./App" resolves as well as "./App.js" (hence the
// optional extension), and a side-effect import — `import "./App.js"` — carries
// no `from` at all, which is exactly how mountWidget would fire by accident.
const MOUNT_PATH =
  /(?:from|import)\s*\(?\s*["'][^"']*\/(App|widget-shell)(\.[jt]sx?)?["']/;

describe("widget-views seam pins", () => {
  it("keys equal the registry widget names minus dashboard, in both directions", () => {
    const expected = WIDGETS.map((w) => w.name)
      .filter((name) => name !== "dashboard")
      .sort();
    expect(Object.keys(WIDGET_VIEWS).sort()).toEqual(expected);
  });

  it("lookupWidgetView returns undefined for inherited prototype keys", () => {
    // WIDGET_VIEWS is a plain object literal, so a bare index would answer each
    // of these with a truthy inherited member.
    for (const key of [
      "toString",
      "valueOf",
      "constructor",
      "hasOwnProperty",
      "__proto__",
    ]) {
      expect(lookupWidgetView(key), `expected no entry for ${key}`).toBeUndefined();
    }
  });

  it("lookupWidgetView resolves known types and refuses unknown ones", () => {
    expect(lookupWidgetView("bar-chart")).toBeDefined();
    expect(lookupWidgetView("sankey")).toBeDefined();
    expect(lookupWidgetView("map")).toBeDefined();
    expect(lookupWidgetView("totally-made-up")).toBeUndefined();
    // Absent on purpose — no dashboard-in-dashboard.
    expect(lookupWidgetView("dashboard")).toBeUndefined();
  });

  it("widget-views and guard modules stay off the mount path", () => {
    const files = [
      join(SRC, "widgets", "shared", "widget-views.ts"),
      join(SRC, "widgets", "shared", "TileBoundary.tsx"),
      // Every guard imports this, so it inherits their constraint.
      join(SRC, "widgets", "shared", "guards.ts"),
      join(SRC, "widgets", "dashboard", "Tile.tsx"),
      ...WIDGETS.map((w) => join(SRC, "widgets", w.name, "guard.ts")),
    ];

    const offenders: string[] = [];
    for (const file of files) {
      expect(existsSync(file), `${file} does not exist`).toBe(true);
      if (MOUNT_PATH.test(readFileSync(file, "utf8"))) offenders.push(file);
    }
    expect(offenders, "these modules ship in the dashboard bundle").toEqual([]);
  });
});
