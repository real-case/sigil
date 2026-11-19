// Layout maths for the heatmap's calendar mode (plan task 4.6, program item 15).
//
// Days are handled as UTC day numbers so a date never shifts with the viewer's
// time zone: "2026-03-29" is the 29th everywhere, including across a daylight-
// saving change. The calendar is weeks as columns and weekdays as rows, the
// layout people already know from contribution graphs.
//
// A span of up to 53 weeks is one continuous block (a rolling year needs no
// split at New Year); anything longer gets one block per calendar year, each
// trimmed to the weeks that hold data.

import type { HeatmapDay } from "../../shared/payloads.js";

const DAY_MS = 86_400_000;
/** Longest span still drawn as one block: 53 weeks. */
export const SINGLE_BLOCK_DAYS = 371;

export type WeekStart = "monday" | "sunday";

/** "2026-11-03" → days since 1970-01-01 (UTC). */
export function dayNumber(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

/** Days since epoch → "2026-11-03". */
export function isoOf(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = first row of the calendar for this `weekStart`. */
export function weekdayRow(day: number, weekStart: WeekStart): number {
  const dow = new Date(day * DAY_MS).getUTCDay(); // 0 = Sunday
  return weekStart === "monday" ? (dow + 6) % 7 : dow;
}

export interface CalendarCell {
  day: number;
  date: string;
  /** Week column within its block. */
  col: number;
  /** Weekday row, 0..6. */
  row: number;
  /** Undefined when the payload has no entry for that day. */
  value: number | undefined;
}

export interface CalendarBlock {
  /** Calendar year, or a "2025–2026" range for a rolling block. */
  label: string;
  weeks: number;
  cells: CalendarCell[];
  /** Month label positions: the week column holding each month's first day. */
  months: { col: number; label: string }[];
}

export interface CalendarLayout {
  blocks: CalendarBlock[];
  min: number;
  max: number;
  total: number;
  /** Days that carry a value. */
  counted: number;
  /** Days in the range without one. */
  missing: number;
  busiest: { date: string; value: number } | null;
  first: string;
  last: string;
}

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const yearOf = (day: number) => new Date(day * DAY_MS).getUTCFullYear();
const dateOfMonth = (day: number) => new Date(day * DAY_MS).getUTCDate();

function block(from: number, to: number, values: Map<number, number>, weekStart: WeekStart): CalendarBlock {
  const origin = from - weekdayRow(from, weekStart);
  const cells: CalendarCell[] = [];
  const months: { col: number; label: string }[] = [];
  for (let day = from; day <= to; day++) {
    const col = Math.floor((day - origin) / 7);
    cells.push({ day, date: isoOf(day), col, row: weekdayRow(day, weekStart), value: values.get(day) });
    if (dateOfMonth(day) === 1 || day === from) {
      // The range's own first month is labelled only when it has room to
      // finish its name before the next one starts.
      if (day !== from || dateOfMonth(day) <= 21) {
        months.push({ col, label: MONTH.format(new Date(day * DAY_MS)) });
      }
    }
  }
  const weeks = Math.floor((to - origin) / 7) + 1;
  const y0 = yearOf(from);
  const y1 = yearOf(to);
  return { label: y0 === y1 ? String(y0) : `${y0}–${y1}`, weeks, cells, months };
}

export function calendarLayout(days: readonly HeatmapDay[], weekStart: WeekStart = "monday"): CalendarLayout {
  const values = new Map<number, number>();
  let min = Infinity;
  let max = -Infinity;
  let total = 0;
  let busiest: { date: string; value: number } | null = null;
  for (const d of days) {
    if (!Number.isFinite(d.value)) continue;
    const n = dayNumber(d.date);
    if (Number.isNaN(n)) continue;
    values.set(n, d.value);
    min = Math.min(min, d.value);
    max = Math.max(max, d.value);
    total += d.value;
    if (!busiest || d.value > busiest.value) busiest = { date: d.date, value: d.value };
  }
  if (values.size === 0) {
    return { blocks: [], min: 0, max: 0, total: 0, counted: 0, missing: 0, busiest: null, first: "", last: "" };
  }
  const keys = [...values.keys()];
  const first = Math.min(...keys);
  const last = Math.max(...keys);
  const blocks: CalendarBlock[] = [];
  if (last - first + 1 <= SINGLE_BLOCK_DAYS) {
    blocks.push(block(first, last, values, weekStart));
  } else {
    for (let y = yearOf(first); y <= yearOf(last); y++) {
      const from = Math.max(first, Math.round(Date.UTC(y, 0, 1) / DAY_MS));
      const to = Math.min(last, Math.round(Date.UTC(y, 11, 31) / DAY_MS));
      if (from <= to) blocks.push(block(from, to, values, weekStart));
    }
  }
  return {
    blocks,
    min,
    max,
    total,
    counted: values.size,
    missing: last - first + 1 - values.size,
    busiest,
    first: isoOf(first),
    last: isoOf(last),
  };
}

/** Weekday names in row order, for the row labels. */
export function weekdayNames(weekStart: WeekStart): string[] {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return weekStart === "monday" ? [...names.slice(1), names[0]!] : names;
}

const LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "Tue, Nov 3, 2026". */
export function fmtDay(iso: string): string {
  return LONG.format(new Date(`${iso}T00:00:00Z`));
}
