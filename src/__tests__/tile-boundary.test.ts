// React 19 does not route a child's throw through getDerivedStateFromError under
// renderToString or renderToStaticMarkup — the error escapes the renderer — so
// containment cannot be proven by server rendering, and mounting for real would
// cost a DOM dependency. Prove the two halves separately instead: the boundary's
// own contract, and that Tile actually wraps the View in it. Either half alone
// passes while the feature is broken.

import { describe, it, expect } from "vitest";
import { isValidElement, type ReactElement } from "react";
import { TileBoundary } from "../widgets/shared/TileBoundary.js";
import { Tile } from "../widgets/dashboard/Tile.js";

interface CardProps {
  variant: string;
  title: string;
  description: string;
}

describe("tile error containment", () => {
  it("maps a thrown error to an error card naming the tile and passes children through otherwise", () => {
    expect(TileBoundary.getDerivedStateFromError(new Error("boom"))).toEqual({
      message: "boom",
    });
    expect(TileBoundary.getDerivedStateFromError(new Error(""))).toEqual({
      message: "An unexpected error occurred.",
    });
    expect(TileBoundary.getDerivedStateFromError("not an Error")).toEqual({
      message: "An unexpected error occurred.",
    });

    const props = { label: "bar-chart", children: "CHILDREN" };

    const healthy = new TileBoundary(props);
    expect(healthy.render()).toBe("CHILDREN");

    const failed = new TileBoundary(props);
    Object.assign(failed, {
      state: TileBoundary.getDerivedStateFromError(new Error("boom")),
    });
    const card = failed.render() as ReactElement<CardProps>;
    expect(isValidElement(card)).toBe(true);
    expect(card.props.variant).toBe("error");
    expect(card.props.title).toBe("Could not render bar-chart");
    expect(card.props.description).toBe("boom");
  });

  it("Tile wraps a valid tile in TileBoundary labelled with the tile type", () => {
    const tree = Tile({
      type: "bar-chart",
      payload: { title: "OK", data: [{ label: "a", value: 1 }], orientation: "vertical" },
    }) as ReactElement<{ children: ReactElement<{ label: string }> }>;

    // EmbeddedContext.Provider → TileBoundary → View
    const boundary = tree.props.children;
    expect(boundary.type).toBe(TileBoundary);
    expect(boundary.props.label).toBe("bar-chart");
  });
});
