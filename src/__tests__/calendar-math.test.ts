import { describe, expect, it } from "vitest";
import { calendarLayout, dayNumber, isoOf, weekdayNames, weekdayRow } from "../widgets/heatmap/calendar-math.js";

describe("calendar layout", () => {
  it("round-trips ISO days without a time-zone shift", () => {
    expect(isoOf(dayNumber("2026-03-29"))).toBe("2026-03-29");
    expect(isoOf(dayNumber("2024-02-29"))).toBe("2024-02-29");
  });

  it("puts weekdays on rows for either week start", () => {
    const monday = dayNumber("2026-11-16");
    expect(weekdayRow(monday, "monday")).toBe(0);
    expect(weekdayRow(monday, "sunday")).toBe(1);
    expect(weekdayNames("monday")[0]).toBe("Mon");
    expect(weekdayNames("sunday")[0]).toBe("Sun");
  });

  it("keeps a missing day as no data, not zero", () => {
    const l = calendarLayout([
      { date: "2026-11-02", value: 4 },
      { date: "2026-11-04", value: 0 },
    ]);
    const cells = l.blocks[0]!.cells;
    expect(cells.map((c) => c.value)).toEqual([4, undefined, 0]);
    expect(l.missing).toBe(1);
    expect(l.counted).toBe(2);
    expect(l.total).toBe(4);
    expect(l.min).toBe(0);
  });

  it("starts a new week column after the last weekday", () => {
    // Sun 2026-11-08 then Mon 2026-11-09: one column apart with Monday weeks.
    const l = calendarLayout([
      { date: "2026-11-08", value: 1 },
      { date: "2026-11-09", value: 1 },
    ]);
    const [sun, mon] = l.blocks[0]!.cells;
    expect(sun!.row).toBe(6);
    expect(mon!.row).toBe(0);
    expect(mon!.col).toBe(sun!.col + 1);
  });

  it("draws a rolling year as one block and longer spans per calendar year", () => {
    const rolling = calendarLayout([
      { date: "2025-11-20", value: 1 },
      { date: "2026-11-18", value: 1 },
    ]);
    expect(rolling.blocks).toHaveLength(1);
    expect(rolling.blocks[0]!.label).toBe("2025–2026");
    expect(rolling.blocks[0]!.weeks).toBeLessThanOrEqual(54);

    const long = calendarLayout([
      { date: "2024-06-01", value: 1 },
      { date: "2026-02-01", value: 1 },
    ]);
    expect(long.blocks.map((b) => b.label)).toEqual(["2024", "2025", "2026"]);
  });

  it("labels each month at the column of its first day", () => {
    const l = calendarLayout([
      { date: "2026-01-01", value: 1 },
      { date: "2026-03-31", value: 1 },
    ]);
    expect(l.blocks[0]!.months.map((m) => m.label)).toEqual(["Jan", "Feb", "Mar"]);
    expect(l.busiest).toEqual({ date: "2026-01-01", value: 1 });
  });
});
