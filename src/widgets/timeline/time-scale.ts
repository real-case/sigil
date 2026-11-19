// Time maths behind render_timeline (plan task 4.5, program item 13).
//
// Times arrive as ISO 8601 text or as plain numbers (never mixed — the schema
// enforces it). Text is parsed with Date.parse and every label is printed in
// UTC, so a date-only "2026-11-03" is the 3rd for every viewer instead of the
// 2nd west of Greenwich.

import type { TimelineItem, TimelinePayload } from "../../shared/payloads.js";
import { niceStep } from "../distribution/distribution-math.js";

export type TimeKind = "date" | "number";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function timeKind(p: Pick<TimelinePayload, "items">): TimeKind {
  return typeof p.items[0]?.start === "number" ? "number" : "date";
}

export function toTime(v: string | number): number {
  return typeof v === "number" ? v : Date.parse(v);
}

/** True when any text time carries a clock part, so labels need hours. */
export function hasClock(p: TimelinePayload): boolean {
  const all: (string | number | undefined)[] = [
    ...p.items.flatMap((i) => [i.start, i.end]),
    ...(p.milestones ?? []).map((m) => m.at),
    p.now,
  ];
  return all.some((v) => typeof v === "string" && v.includes("T"));
}

export interface ResolvedItem {
  /** Index in payload.items. */
  index: number;
  row: string;
  start: number;
  end: number;
  /** True when `end` was inferred (next item in the row, `now`, or the chart end). */
  open: boolean;
  item: TimelineItem;
}

export interface TimelineLayout {
  rows: string[];
  items: ResolvedItem[];
  min: number;
  max: number;
  now?: number;
}

/**
 * Lanes and intervals with every open end filled in: an item without `end`
 * lasts until the next item in its row starts (a state change), else until
 * `now` when that is later, else until the end of the chart.
 */
export function timelineLayout(p: TimelinePayload): TimelineLayout {
  const rows: string[] = [];
  const seen = new Set<string>();
  const addRow = (r: string) => {
    if (!seen.has(r)) {
      seen.add(r);
      rows.push(r);
    }
  };
  for (const r of p.rows ?? []) addRow(r);
  for (const it of p.items) addRow(it.row);
  for (const m of p.milestones ?? []) if (m.row) addRow(m.row);

  const now = p.now === undefined ? undefined : toTime(p.now);
  let min = Infinity;
  let max = -Infinity;
  const see = (t: number) => {
    if (!Number.isFinite(t)) return;
    min = Math.min(min, t);
    max = Math.max(max, t);
  };
  for (const it of p.items) {
    see(toTime(it.start));
    if (it.end !== undefined) see(toTime(it.end));
  }
  for (const m of p.milestones ?? []) see(toTime(m.at));
  if (now !== undefined) see(now);
  if (!Number.isFinite(min)) {
    min = 0;
    max = 1;
  }

  const byRow = new Map<string, number[]>();
  p.items.forEach((it, i) => {
    const list = byRow.get(it.row) ?? [];
    list.push(i);
    byRow.set(it.row, list);
  });
  const resolved: ResolvedItem[] = [];
  for (const row of rows) {
    const idx = (byRow.get(row) ?? []).sort((a, b) => toTime(p.items[a]!.start) - toTime(p.items[b]!.start));
    idx.forEach((i, k) => {
      const it = p.items[i]!;
      const start = toTime(it.start);
      if (!Number.isFinite(start)) return;
      if (it.end !== undefined) {
        resolved.push({ index: i, row, start, end: toTime(it.end), open: false, item: it });
        return;
      }
      const next = idx[k + 1];
      const nextStart = next === undefined ? undefined : toTime(p.items[next]!.start);
      const end =
        nextStart !== undefined && nextStart > start
          ? nextStart
          : now !== undefined && now > start
            ? now
            : max;
      resolved.push({ index: i, row, start, end, open: true, item: it });
    });
  }
  if (max === min) {
    // A single instant: give the axis some width to draw it in.
    const pad = timeKind(p) === "date" ? DAY / 2 : 0.5;
    min -= pad;
    max += pad;
  }
  return { rows, items: resolved, min, max, now };
}

// ----- ticks -------------------------------------------------------------------

interface Interval {
  ms: number;
  /** Calendar step in months (month / quarter / year ticks). */
  months?: number;
}

const INTERVALS: Interval[] = [
  { ms: MIN },
  { ms: 5 * MIN },
  { ms: 15 * MIN },
  { ms: 30 * MIN },
  { ms: HOUR },
  { ms: 3 * HOUR },
  { ms: 6 * HOUR },
  { ms: 12 * HOUR },
  { ms: DAY },
  { ms: 2 * DAY },
  { ms: 7 * DAY },
  { ms: 30 * DAY, months: 1 },
  { ms: 91 * DAY, months: 3 },
  { ms: 365 * DAY, months: 12 },
  { ms: 2 * 365 * DAY, months: 24 },
  { ms: 5 * 365 * DAY, months: 60 },
];

export interface Tick {
  at: number;
  label: string;
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: "UTC" });
const F_YEAR = fmt({ year: "numeric" });
const F_MONTH = fmt({ month: "short" });
const F_MONTH_YEAR = fmt({ month: "short", year: "numeric" });
const F_DAY = fmt({ month: "short", day: "numeric" });
const F_CLOCK = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const F_FULL_DAY = fmt({ weekday: "short", month: "short", day: "numeric", year: "numeric" });
const F_FULL_CLOCK = fmt({ month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Calendar-aligned UTC ticks, about `approx` of them, across [min, max]. */
export function timeTicks(min: number, max: number, approx: number): Tick[] {
  const span = max - min;
  const target = span / Math.max(1, approx);
  const step = INTERVALS.find((i) => i.ms >= target) ?? INTERVALS[INTERVALS.length - 1]!;
  const ticks: Tick[] = [];
  if (step.months) {
    // Months since year 0 of the first whole month at or after `min`, rounded
    // up to the step so quarters land on Jan / Apr / Jul / Oct.
    const d = new Date(min);
    const partial = d.getUTCDate() > 1 || d.getUTCHours() > 0 || d.getUTCMinutes() > 0;
    const startMonth = d.getUTCFullYear() * 12 + d.getUTCMonth() + (partial ? 1 : 0);
    const firstMonth = Math.ceil(startMonth / step.months) * step.months;
    for (let k = 0; k < 400; k++) {
      const total = firstMonth + k * step.months;
      const at = Date.UTC(Math.floor(total / 12), total % 12, 1);
      if (at > max) break;
      const date = new Date(at);
      const label =
        step.months >= 12
          ? F_YEAR.format(date)
          : date.getUTCMonth() === 0 || ticks.length === 0
            ? F_MONTH_YEAR.format(date)
            : F_MONTH.format(date);
      ticks.push({ at, label });
    }
    return ticks;
  }
  // Day-or-shorter steps align to UTC midnight (weeks: to a Monday).
  let first = Math.ceil(min / step.ms) * step.ms;
  if (step.ms === 7 * DAY) {
    const monday = 4 * DAY; // 1970-01-05 was a Monday; epoch day 0 a Thursday
    first = Math.ceil((min - monday) / step.ms) * step.ms + monday;
  }
  let lastDay = -1;
  for (let at = first; at <= max && ticks.length < 400; at += step.ms) {
    const day = Math.floor(at / DAY);
    let label: string;
    if (step.ms >= DAY) label = F_DAY.format(new Date(at));
    else if (day !== lastDay) label = `${F_DAY.format(new Date(at))} ${F_CLOCK.format(new Date(at))}`;
    else label = F_CLOCK.format(new Date(at));
    lastDay = day;
    ticks.push({ at, label });
  }
  return ticks;
}

/** Round numeric ticks. */
export function numberTicks(min: number, max: number, approx: number): Tick[] {
  const step = niceStep((max - min) / Math.max(1, approx));
  const ticks: Tick[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9 && ticks.length < 400; t += step) {
    const v = Number(t.toPrecision(12));
    ticks.push({ at: v, label: String(v) });
  }
  return ticks;
}

/** A time as text: the full date (and clock, when the payload has clocks). */
export function fmtTime(t: number, kind: TimeKind, clock: boolean, unit?: string): string {
  if (kind === "number") return unit ? `${unit} ${Number(t.toPrecision(12))}` : String(Number(t.toPrecision(12)));
  return clock ? `${F_FULL_CLOCK.format(new Date(t))} UTC` : F_FULL_DAY.format(new Date(t));
}

/** A length of time as text: "3 d 4 h", "45 min", or "12 sprints". */
export function fmtDuration(ms: number, kind: TimeKind, unit?: string): string {
  if (kind === "number") {
    const n = Number(ms.toPrecision(12));
    return unit ? `${n} ${unit}${n === 1 ? "" : "s"}` : String(n);
  }
  if (ms < MIN) return "under a minute";
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const mins = Math.round((ms % HOUR) / MIN);
  if (days >= 7 && hours === 0) return `${days} days`;
  const parts: string[] = [];
  if (days) parts.push(`${days} d`);
  if (hours) parts.push(`${hours} h`);
  if (mins && days === 0) parts.push(`${mins} min`);
  return parts.join(" ") || "0 min";
}
