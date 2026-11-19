// Drill-down rests on two promises: no menu on a host that cannot take a
// message (a click keeps its old meaning), and exactly one message per pick on
// a host that can. Both are pinned on the channel itself and, for the first,
// on a server render of a real view.

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  createFollowUp,
  DEFAULT_FOLLOW_UPS,
  followUpActions,
  FollowUpProvider,
  selectionContext,
  type FollowUpHost,
} from "../widgets/shared/follow-up.js";
import { clampMenuX } from "../widgets/shared/MarkMenu.js";
import { TableView } from "../widgets/table/TableView.js";
import type { TablePayload } from "../shared/payloads.js";

interface FakeHost extends FollowUpHost {
  sent: string[];
  context: string[];
  release(): void;
}

/** A host with the given capabilities whose sendMessage resolves on release(). */
function fakeHost(caps: { message?: object; updateModelContext?: object } | undefined): FakeHost {
  let pending: Array<() => void> = [];
  const host: FakeHost = {
    sent: [],
    context: [],
    getHostCapabilities: () => caps,
    sendMessage: ({ content }) => {
      host.sent.push(content.map((c) => c.text).join(""));
      return new Promise((resolve) => pending.push(() => resolve({})));
    },
    updateModelContext: async ({ content }) => {
      host.context.push(content.map((c) => c.text).join(""));
      return {};
    },
    release() {
      for (const r of pending) r();
      pending = [];
    },
  };
  return host;
}

describe("createFollowUp", () => {
  it("is null on a host that has not declared `message`", () => {
    expect(createFollowUp(fakeHost({}))).toBeNull();
    expect(createFollowUp(fakeHost(undefined))).toBeNull();
    expect(createFollowUp(fakeHost({ updateModelContext: {} }))).toBeNull();
    expect(createFollowUp(null)).toBeNull();
  });

  it("sends exactly one message while a request is in flight", async () => {
    const host = fakeHost({ message: {} });
    const channel = createFollowUp(host)!;
    const first = channel.ask("one");
    const second = channel.ask("two");
    expect(await second).toBe(false);
    host.release();
    expect(await first).toBe(true);
    expect(host.sent).toEqual(["one"]);
    // Once the first has landed, the next pick goes through.
    const third = channel.ask("three");
    host.release();
    expect(await third).toBe(true);
    expect(host.sent).toEqual(["one", "three"]);
  });

  it("reports a rejected or failed send as false and stays usable", async () => {
    const host = fakeHost({ message: {} });
    host.sendMessage = async () => ({ isError: true });
    const channel = createFollowUp(host)!;
    expect(await channel.ask("x")).toBe(false);
    host.sendMessage = async () => {
      throw new Error("connection lost");
    };
    expect(await channel.ask("y")).toBe(false);
    host.sendMessage = async () => ({});
    expect(await channel.ask("z")).toBe(true);
  });

  it("updates model context only where the host declares it", async () => {
    const without = fakeHost({ message: {} });
    createFollowUp(without)!.select("ctx");
    const withCtx = fakeHost({ message: {}, updateModelContext: {} });
    createFollowUp(withCtx)!.select("ctx");
    await Promise.resolve();
    expect(without.context).toEqual([]);
    expect(withCtx.context).toEqual(["ctx"]);
  });
});

describe("follow-up text", () => {
  const mark = { label: "EMEA, Q3", value: "1.2M" };

  it("quotes the mark, its value and the chart title in every default", () => {
    for (const action of DEFAULT_FOLLOW_UPS) {
      const text = action.text(mark, "Revenue by region");
      expect(text).toContain('"EMEA, Q3" (1.2M)');
      expect(text).toContain('"Revenue by region"');
    }
  });

  it("uses the payload's own followUps instead of the defaults", () => {
    const actions = followUpActions(["Break down by product…", "  ", "Compare with Q2"]);
    expect(actions.map((a) => a.label)).toEqual(["Break down by product…", "Compare with Q2"]);
    expect(actions[0]!.text(mark, "Revenue")).toBe(
      'Break down by product: "EMEA, Q3" (1.2M) in the chart "Revenue".',
    );
    expect(followUpActions([])).toBe(DEFAULT_FOLLOW_UPS);
    expect(followUpActions(undefined)).toBe(DEFAULT_FOLLOW_UPS);
  });

  it("names the selection for the model context", () => {
    expect(selectionContext({ label: "Q3" }, "Revenue")).toBe(
      'The user selected "Q3" in the chart "Revenue".',
    );
  });
});

describe("menu placement", () => {
  it("keeps the menu inside the frame", () => {
    expect(clampMenuX(-50, 220, 400)).toBe(4);
    expect(clampMenuX(300, 220, 400)).toBe(176);
    expect(clampMenuX(100, 220, 400)).toBe(100);
  });
});

describe("a view without a follow-up channel behaves as before", () => {
  const table: TablePayload = {
    title: "Orders",
    columns: [
      { key: "id", label: "Order" },
      { key: "total", label: "Total" },
    ],
    rows: [
      { id: "A-1", total: 10 },
      { id: "A-2", total: 20 },
    ],
  };

  it("renders no menu affordance and no row tab stops", () => {
    const html = renderToString(<TableView payload={table} />);
    expect(html).not.toContain("aria-haspopup");
    expect(html).not.toContain("tabindex");
  });

  it("turns rows into one roving tab stop when the host takes messages", () => {
    const channel = createFollowUp(fakeHost({ message: {} }));
    const html = renderToString(
      <FollowUpProvider value={channel}>
        <TableView payload={table} />
      </FollowUpProvider>,
    );
    expect(html.match(/aria-haspopup="menu"/g)).toHaveLength(2);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(1);
  });
});
