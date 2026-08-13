// extractPayload runs a widget's own guard over a value the host handed across,
// and a guard can throw rather than answer: isTreemapNode recurses on `children`
// with no depth bound, and the text branch feeds the guard whatever JSON.parse
// makes of free text, which no tool schema has vetted. Tile.tsx already defends
// its guard call for this reason and costs one tile — "a guard that cannot
// answer is a guard that says no". The shell had no such defence, so the same
// throw escaped the ontoolresult handler and unmounted the entire widget instead
// of showing "Could not parse the tool result."
//
// extractPayload's contract is tested directly rather than through a render:
// React 19 does not route a child's throw through error boundaries under
// renderToString (see .marvin/memory/widget-views-server-render-in-the-node.md),
// so containment is not provable by server rendering.

import { describe, it, expect } from "vitest";
import { extractPayload } from "../widgets/shared/widget-shell.js";
import { isTreemapPayload } from "../widgets/treemap/guard.js";
import type { TreemapPayload } from "../shared/payloads.js";

// Nested past any real stack, the way an adversarial tool result would be.
const abyss = (): unknown => {
  let node: Record<string, unknown> = { label: "leaf", value: 1 };
  for (let i = 0; i < 50_000; i += 1) {
    node = { label: "n", value: 1, children: [node] };
  }
  return { title: "abyss", data: [node] };
};

// Answers for the absent structuredContent and throws only once it is handed the
// parsed text. A guard that threw unconditionally would blow up on the first
// branch and never reach the second — the failure this stand-in is here to test.
const cannotAnswerText = (value: unknown): value is { title: string } => {
  if (value === undefined) return false;
  throw new RangeError("Maximum call stack size exceeded");
};

const valid: TreemapPayload = { title: "OK", data: [{ label: "a", value: 1 }] };

describe("extractPayload", () => {
  it("reports no payload when the structuredContent guard throws", () => {
    const payload = abyss();

    // Pin the premise, not just the outcome: the assertion below passes whether
    // the guard threw or simply returned false, so without this the test would
    // quietly stop covering the try/catch the day isTreemapNode goes iterative
    // — or the day a runtime ships a deeper stack.
    expect(() => isTreemapPayload(payload)).toThrow(RangeError);

    expect(extractPayload({ structuredContent: payload }, isTreemapPayload)).toBeNull();
  });

  it("reports no payload when the parsed-text guard throws", () => {
    // A real deep payload cannot be routed through this branch: JSON.stringify
    // recurses too and blows the stack before the text exists. Hence a stand-in
    // guard — the branch's own defence is what is under test, and pre-fix it was
    // only ever incidental, borrowed from the catch that belongs to JSON.parse.
    expect(
      extractPayload({ content: [{ type: "text", text: '{"title":"t"}' }] }, cannotAnswerText),
    ).toBeNull();
  });

  it("still extracts a usable payload from either branch", () => {
    expect(extractPayload({ structuredContent: valid }, isTreemapPayload)).toEqual(valid);
    expect(
      extractPayload(
        { content: [{ type: "text", text: JSON.stringify(valid) }] },
        isTreemapPayload,
      ),
    ).toEqual(valid);
  });
});
