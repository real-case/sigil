// Server-renders the real DashboardView to prove per-tile degradation: one bad
// tile must cost exactly one tile. Before this change every case below threw or
// was rejected wholesale at the payload guard, taking the entire grid with it.
//
// renderToString HTML-escapes text children, so assertions over copy containing
// quotes match the escaped form — the rendered copy keeps its real quotes.

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { DashboardView } from "../widgets/dashboard/DashboardView.js";
import { isTreemapPayload } from "../widgets/treemap/guard.js";
import type { DashboardPayload } from "../shared/payloads.js";

const validBar = (title: string): DashboardPayload["tiles"][number] => ({
  type: "bar-chart",
  payload: { title, data: [{ label: "a", value: 1 }], orientation: "vertical" },
});

const render = (tiles: DashboardPayload["tiles"]): string =>
  renderToString(<DashboardView payload={{ title: "Dash", tiles }} />);

describe("dashboard tiles", () => {
  it("a guard-rejected tile degrades to an error card naming its type while siblings render", () => {
    // Pre-fix this threw `Cannot read properties of null (reading 'reduce')`
    // straight out of renderToString.
    const html = render([
      {
        type: "bar-chart",
        payload: { title: "broken", data: null, orientation: "vertical" },
      },
      validBar("HEALTHY SIBLING"),
    ]);

    expect(html).toContain("Invalid bar-chart tile");
    expect(html).toContain("The payload did not match the bar-chart schema.");
    expect(html).toContain("HEALTHY SIBLING");
  });

  it("an unrecognised tile type, including an Object.prototype key, renders the unknown-widget card while siblings render", () => {
    const html = render([
      { type: "totally-made-up", payload: {} },
      // A bare WIDGET_VIEWS index would answer this with a truthy inherited
      // function, and the TypeError would escape above the tile boundary.
      { type: "toString", payload: {} },
      validBar("HEALTHY SIBLING"),
    ]);

    expect(html).toContain("No widget of type &quot;totally-made-up&quot;.");
    expect(html).toContain("No widget of type &quot;toString&quot;.");
    expect(html).toContain("HEALTHY SIBLING");
  });

  it("a dashboard tile renders the nested-dashboard card", () => {
    const html = render([
      { type: "dashboard", payload: { title: "inner", tiles: [] } },
      validBar("HEALTHY SIBLING"),
    ]);

    expect(html).toContain("Nested dashboard");
    expect(html).toContain("A dashboard cannot be a tile inside another dashboard.");
    // Not the generic card — the widget exists, it is simply not nestable.
    expect(html).not.toContain("Unknown widget");
    expect(html).toContain("HEALTHY SIBLING");
  });

  it("a tile whose guard throws degrades like any other invalid tile", () => {
    // The guard runs above the tile boundary, so a throwing guard would escape
    // to DashboardView. Tile payloads never pass through the tool schema, and
    // isTreemapNode recurses on `children` without a depth bound — so this
    // payload reaches it as a RangeError rather than a `false`.
    let node: Record<string, unknown> = { label: "leaf", value: 1 };
    for (let i = 0; i < 50_000; i += 1) {
      node = { label: "n", value: 1, children: [node] };
    }

    // Pin the premise, not just the outcome: the assertions below pass whether
    // the guard threw or simply returned false, so without this the test would
    // quietly stop covering Tile's try/catch the day isTreemapNode goes
    // iterative — or the day a runtime ships a deeper stack.
    expect(() => isTreemapPayload({ title: "abyss", data: [node] })).toThrow(RangeError);

    const html = render([
      { type: "treemap", payload: { title: "abyss", data: [node] } },
      validBar("HEALTHY SIBLING"),
    ]);

    expect(html).toContain("Invalid treemap tile");
    expect(html).toContain("HEALTHY SIBLING");
  });

  it("renders sankey and map tiles, which the old tile-type set rejected outright", () => {
    const html = render([
      { type: "sankey", payload: { title: "FLOW", links: [{ source: "A", target: "B", value: 1 }] } },
      {
        type: "map",
        payload: {
          title: "GEO",
          scope: "world",
          variant: "choropleth",
          data: [{ id: "USA", value: 1 }],
        },
      },
    ]);

    expect(html).toContain("FLOW");
    expect(html).toContain("GEO");
    expect(html).not.toContain("Unknown widget");
    expect(html).not.toContain("did not match");
  });
});
