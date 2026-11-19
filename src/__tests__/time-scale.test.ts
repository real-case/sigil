import { describe, expect, it } from "vitest";
import { fmtDuration, numberTicks, timeTicks, timelineLayout } from "../widgets/timeline/time-scale.js";
import type { TimelinePayload } from "../shared/payloads.js";

const DAY = 86_400_000;

describe("timeline layout", () => {
  it("runs an open item to the next change in its lane", () => {
    const p: TimelinePayload = {
      title: "T",
      items: [
        { row: "api", start: 0, state: "up" },
        { row: "api", start: 5, state: "down" },
        { row: "api", start: 7, state: "up" },
      ],
      now: 10,
    };
    const l = timelineLayout(p);
    expect(l.items.map((i) => [i.start, i.end, i.open])).toEqual([
      [0, 5, true],
      [5, 7, true],
      [7, 10, true],
    ]);
  });

  it("runs the last open item to the chart end without `now`", () => {
    const l = timelineLayout({
      title: "T",
      items: [
        { row: "a", start: 0, end: 12 },
        { row: "b", start: 3 },
      ],
    });
    expect(l.items.find((i) => i.row === "b")!.end).toBe(12);
  });

  it("orders lanes: declared rows first, then first-seen", () => {
    const l = timelineLayout({
      title: "T",
      rows: ["QA"],
      items: [
        { row: "Build", start: 0, end: 1 },
        { row: "QA", start: 1, end: 2 },
        { row: "Design", start: 0, end: 1 },
      ],
    });
    expect(l.rows).toEqual(["QA", "Build", "Design"]);
  });

  it("gives a single instant some axis width", () => {
    const l = timelineLayout({ title: "T", items: [{ row: "a", start: "2026-01-01" }] });
    expect(l.max - l.min).toBe(DAY);
  });
});

describe("ticks", () => {
  it("aligns month ticks to the 1st in UTC", () => {
    const t = timeTicks(Date.UTC(2026, 9, 12), Date.UTC(2027, 1, 3), 5);
    expect(t.map((x) => new Date(x.at).getUTCDate())).toEqual(t.map(() => 1));
    expect(t[0]!.label).toBe("Nov 2026");
    expect(t.some((x) => x.label === "Jan 2027")).toBe(true);
  });

  it("uses clock labels within a day and dates the first one", () => {
    const t = timeTicks(Date.UTC(2026, 10, 18, 0), Date.UTC(2026, 10, 18, 23, 59), 6);
    expect(t[0]!.label).toMatch(/^Nov 18 00:00$/);
    expect(t[1]!.label).toMatch(/^\d\d:00$/);
  });

  it("rounds numeric ticks", () => {
    expect(numberTicks(1, 6, 5).map((x) => x.at)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("formats durations", () => {
    expect(fmtDuration(45 * 60_000, "date")).toBe("45 min");
    expect(fmtDuration(DAY + 3 * 3_600_000, "date")).toBe("1 d 3 h");
    expect(fmtDuration(14 * DAY, "date")).toBe("14 days");
    expect(fmtDuration(3, "number", "sprint")).toBe("3 sprints");
  });
});
