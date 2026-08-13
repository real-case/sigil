import { vi, describe, it, expect, beforeEach } from "vitest";

const { registerAppToolMock } = vi.hoisted(() => ({
  registerAppToolMock: vi.fn(),
}));

vi.mock("@modelcontextprotocol/ext-apps/server", () => ({
  registerAppTool: registerAppToolMock,
  registerAppResource: vi.fn(),
  RESOURCE_MIME_TYPE: "text/html+skybridge",
}));

import { z } from "zod";
import { WIDGETS } from "../registry.js";
import { DASHBOARD_TILE_TYPES } from "../shared/payloads.js";

describe("tool registration", () => {
  beforeEach(() => {
    registerAppToolMock.mockClear();
  });

  for (const widget of WIDGETS) {
    it(`${widget.name}: registers exactly one tool`, () => {
      const fakeServer = {} as never;
      widget.register(fakeServer);
      expect(registerAppToolMock).toHaveBeenCalledTimes(1);
    });

    it(`${widget.name}: tool description references its purpose`, () => {
      const fakeServer = {} as never;
      widget.register(fakeServer);
      const [, toolName, config] = registerAppToolMock.mock.calls[0]!;
      expect(toolName).toMatch(/^render_/);
      expect(config.description.length).toBeGreaterThan(40);
      expect(config._meta.ui.resourceUri).toBe(widget.uri);
    });
  }
});

// The registry pin in registry.test.ts proves DASHBOARD_TILE_TYPES matches the
// registry. This proves the schema the host is actually offered was built from
// it — the two are only the same statement while the enum stays derived, and
// the whole defect here was an enum that had quietly stopped tracking anything.
describe("render_dashboard tile types", () => {
  const dashboard = WIDGETS.find((w) => w.name === "dashboard")!;

  /** Rebuild the tool's declared input schema from what it registered. */
  function dashboardSchema() {
    registerAppToolMock.mockClear();
    dashboard.register({} as never);
    const [, , config] = registerAppToolMock.mock.calls[0]!;
    return z.object(config.inputSchema as Record<string, z.ZodType>);
  }

  const accepts = (schema: z.ZodType, type: string): boolean =>
    schema.safeParse({ title: "T", tiles: [{ type, payload: {} }] }).success;

  it("accepts a tile of every tileable widget", () => {
    const schema = dashboardSchema();
    const rejected = DASHBOARD_TILE_TYPES.filter((type) => !accepts(schema, type));
    expect(rejected, "render_dashboard refuses tiles the registry says are tileable").toEqual([]);
  });

  it("refuses a nested dashboard and an unknown type", () => {
    const schema = dashboardSchema();
    expect(accepts(schema, "dashboard"), "a dashboard must not nest").toBe(false);
    expect(accepts(schema, "totally-made-up")).toBe(false);
  });
});
