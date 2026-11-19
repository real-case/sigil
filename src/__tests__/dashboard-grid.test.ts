import { describe, expect, it } from "vitest";
import {
  clampSpan,
  declaredColumns,
  effectiveColumns,
  MIN_TILE_WIDTH,
  provenanceLine,
} from "../widgets/dashboard/grid-layout.js";
import { DASHBOARD_TEMPLATES, DASHBOARD_TILE_TYPES, dashboardSchema } from "../shared/schemas.js";

describe("responsive dashboard grid", () => {
  it("treats columns as a maximum, clamped to 1..4", () => {
    expect(declaredColumns(undefined)).toBe(2);
    expect(declaredColumns(9)).toBe(4);
    expect(declaredColumns(0)).toBe(1);
  });

  it("keeps the declared count before the first measurement", () => {
    expect(effectiveColumns(3, 0)).toBe(3);
  });

  it("drops columns as the container narrows, never below one", () => {
    const gap = 16;
    const fits = (n: number) => n * MIN_TILE_WIDTH + (n - 1) * gap;
    expect(effectiveColumns(4, fits(4))).toBe(4);
    expect(effectiveColumns(4, fits(4) - 1)).toBe(3);
    expect(effectiveColumns(4, fits(2))).toBe(2);
    expect(effectiveColumns(3, 320)).toBe(1);
    expect(effectiveColumns(2, 4000)).toBe(2);
  });

  it("clamps a tile's span to the effective column count", () => {
    expect(clampSpan(2, 1)).toBe(1);
    expect(clampSpan(3, 2)).toBe(2);
    expect(clampSpan(undefined, 3)).toBe(1);
    expect(clampSpan(2, 4)).toBe(2);
  });

  it("writes provenance as Source · As of", () => {
    expect(provenanceLine({ source: "Stripe", asOf: "Nov 18" })).toBe("Source: Stripe · As of Nov 18");
    expect(provenanceLine({ asOf: "Nov 18" })).toBe("As of Nov 18");
    expect(provenanceLine({})).toBeNull();
  });
});

describe("dashboard templates", () => {
  it("are part of what the model reads on render_dashboard", () => {
    const described = dashboardSchema.shape.tiles.description ?? "";
    expect(described).toContain(DASHBOARD_TEMPLATES);
  });

  it("name only tile types that exist", () => {
    // Every hyphenated widget-looking word in the templates must be a real tile
    // type, so renaming or removing a widget cannot leave the advice stale.
    const named = DASHBOARD_TEMPLATES.match(/\b[a-z]+-[a-z]+\b/g) ?? [];
    const candidates = named.filter((w) => /(chart|panel|card)$/.test(w));
    for (const w of candidates) expect(DASHBOARD_TILE_TYPES).toContain(w);
    for (const t of ["stat-panel", "line-chart", "funnel", "heatmap", "distribution", "timeline", "info-card", "bar-chart"]) {
      expect(DASHBOARD_TEMPLATES).toContain(t);
    }
  });

  it("covers the four templates from the plan", () => {
    for (const name of ["RED", "USE", "SaaS KPIs", "Product analytics"]) {
      expect(DASHBOARD_TEMPLATES).toContain(name);
    }
  });
});
