import { vi, describe, it, expect, beforeEach } from "vitest";

const { registerAppToolMock } = vi.hoisted(() => ({
  registerAppToolMock: vi.fn(),
}));

vi.mock("@modelcontextprotocol/ext-apps/server", () => ({
  registerAppTool: registerAppToolMock,
  registerAppResource: vi.fn(),
  RESOURCE_MIME_TYPE: "text/html+skybridge",
}));

import { WIDGETS } from "../registry.js";

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
