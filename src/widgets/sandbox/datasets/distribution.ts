import type { DistributionPayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

// Deterministic pseudo-random draws, so a preset renders the same every time.
function det(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280;
  return x - Math.floor(x);
}

/** Roughly log-normal: a long right tail, the shape latency really has. */
function latency(seed: number, n: number, median: number, spread: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    // Box–Muller from two deterministic uniforms.
    const u = Math.max(1e-6, det(seed, i));
    const v = det(seed + 7, i);
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    out.push(Math.round(median * Math.exp(spread * z)));
  }
  return out;
}

/** Two humps: e.g. order values for a cheap and a premium plan. */
function bimodal(seed: number, n: number): number[] {
  return latency(seed, n, 1, 0).map((_, i) => {
    const u = det(seed, i);
    const centre = u < 0.62 ? 38 : 112;
    return Math.round(centre + (det(seed + 3, i) - 0.5) * 2 * (u < 0.62 ? 14 : 22));
  });
}

export const distributionDatasets: Dataset<DistributionPayload>[] = [
  {
    id: "distribution-minimal",
    label: "Minimal — 3 values",
    category: "minimal",
    payload: {
      title: "Build times",
      valueLabel: "Minutes",
      groups: [{ name: "Builds", values: [4, 6, 5] }],
    },
  },
  {
    id: "distribution-latency",
    label: "Small — latency histogram with SLO",
    category: "small",
    payload: {
      title: "Checkout API response time, last 24 h",
      valueLabel: "Response time (ms)",
      groups: [{ name: "Checkout API", values: latency(3, 1200, 180, 0.55) }],
      markers: [{ value: 400, label: "SLO 400 ms", tone: "danger" }],
      followUps: ["Which endpoints are slowest?", "Compare with last week", "Show requests over the SLO"],
    },
  },
  {
    id: "distribution-bimodal",
    label: "Medium — bimodal order value",
    category: "medium",
    payload: {
      title: "Order value, October",
      valueLabel: "Order value ($)",
      binCount: 30,
      groups: [{ name: "Orders", values: bimodal(11, 900) }],
    },
  },
  {
    id: "distribution-groups-histogram",
    label: "Multi-series — 3 regions, shared scales",
    category: "multiSeries",
    payload: {
      title: "Page load time by region",
      valueLabel: "Load time (ms)",
      groups: [
        { name: "Europe", values: latency(5, 500, 900, 0.35) },
        { name: "North America", values: latency(8, 500, 1100, 0.4) },
        { name: "Asia-Pacific", values: latency(13, 300, 1700, 0.45) },
      ],
      markers: [{ value: 2500, label: "LCP budget", tone: "warning" }],
    },
  },
  {
    id: "distribution-box-versions",
    label: "Large — box plots, 8 releases",
    category: "large",
    payload: {
      title: "p95 latency per release",
      variant: "box",
      valueLabel: "Latency (ms)",
      groups: ["2.0", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"].map((v, i) => ({
        name: `v${v}`,
        values: latency(20 + i, 240, 260 - i * 14 + (i === 5 ? 80 : 0), 0.3 + (i === 5 ? 0.2 : 0)),
      })),
      markers: [{ value: 300, label: "Target", tone: "success" }],
    },
  },
  {
    id: "distribution-box-summary",
    label: "Edge — box from pre-computed summaries, long names",
    category: "edgeLabels",
    payload: {
      title: "Ticket resolution time by support tier",
      variant: "box",
      valueLabel: "Hours to resolve",
      groups: [
        { name: "Enterprise priority support", summary: { min: 0.5, q1: 2, median: 3.5, q3: 6, max: 11, mean: 4.4, count: 812, outliers: [19, 26] } },
        { name: "Business", summary: { min: 1, q1: 4, median: 7, q3: 12, max: 24, mean: 8.9, count: 2_430, outliers: [38, 41, 52] } },
        { name: "Self-serve community forum", summary: { min: 2, q1: 10, median: 22, q3: 40, max: 84, count: 5_120 } },
      ],
    },
  },
  {
    id: "distribution-prebinned",
    label: "Negatives — pre-binned, below zero",
    category: "negatives",
    payload: {
      title: "Daily P&L per desk",
      valueLabel: "P&L ($K)",
      groups: [
        {
          name: "All desks",
          bins: [
            { start: -60, end: -40, count: 3 },
            { start: -40, end: -20, count: 11 },
            { start: -20, end: 0, count: 46 },
            { start: 0, end: 20, count: 71 },
            { start: 20, end: 40, count: 29 },
            { start: 40, end: 60, count: 8 },
            { start: 60, end: 80, count: 2 },
          ],
        },
      ],
      markers: [{ value: 0, label: "Break-even" }],
    },
  },
];
