import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WIDGETS } from "../registry.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDGETS_DIR = join(HERE, "..", "widgets");
const URI_PREFIX = "ui://sigil/";

describe("widget registry", () => {
  it("has the expected production widget set", () => {
    const names = WIDGETS.map((w) => w.name).sort();
    expect(names).toEqual([
      "bar-chart",
      "dashboard",
      "heatmap",
      "line-chart",
      "map",
      "pie-chart",
      "scatter-chart",
      "stat-panel",
      "table",
      "treemap",
    ]);
  });

  for (const widget of WIDGETS) {
    describe(widget.name, () => {
      it("uri follows the ui://sigil/<name> convention", () => {
        expect(widget.uri).toBe(`${URI_PREFIX}${widget.name}`);
      });

      it("has a register function", () => {
        expect(typeof widget.register).toBe("function");
      });

      it("has a matching widget directory", () => {
        const dir = join(WIDGETS_DIR, widget.name);
        expect(existsSync(join(dir, "App.tsx"))).toBe(true);
        expect(existsSync(join(dir, "index.html"))).toBe(true);
      });
    });
  }

  it("widget names are unique", () => {
    const names = WIDGETS.map((w) => w.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("widget URIs are unique", () => {
    const uris = WIDGETS.map((w) => w.uri);
    expect(new Set(uris).size).toBe(uris.length);
  });
});
