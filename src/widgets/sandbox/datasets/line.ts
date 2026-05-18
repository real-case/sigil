import type { LineChartPayload, LineDatum } from "../../../shared/payloads.js";
import { CATEGORY_COUNT, type Dataset } from "./types.js";

function det(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280;
  return x - Math.floor(x);
}

function ramp(seed: number, n: number, base: number, span: number): LineDatum[] {
  // Smoothed pseudo-random walk → looks like real time-series, not pure noise.
  let v = base;
  const out: LineDatum[] = [];
  for (let i = 0; i < n; i++) {
    v = v * 0.7 + (base + det(seed, i) * span) * 0.3;
    out.push({ x: i + 1, y: Math.round(v * 100) / 100 });
  }
  return out;
}

const MONTHS_5 = ["Jan", "Feb", "Mar", "Apr", "May"];

export const lineDatasets: Dataset<LineChartPayload>[] = [
  {
    id: "line-minimal-single",
    label: "Minimal — single point",
    category: "minimal",
    payload: {
      title: "Sensor reading",
      xlabel: "t",
      ylabel: "°C",
      series: [{ name: "Probe A", data: [{ x: 0, y: 22.3 }] }],
    },
  },
  {
    id: "line-small-categorical",
    label: "Small — 5 months categorical",
    category: "small",
    payload: {
      title: "Monthly active users",
      xlabel: "Month",
      ylabel: "MAU",
      series: [
        {
          name: "Free tier",
          data: MONTHS_5.map((m, i) => ({ x: m, y: 1200 + i * 220 })),
        },
        {
          name: "Paid tier",
          data: MONTHS_5.map((m, i) => ({ x: m, y: 320 + i * 95 })),
        },
      ],
    },
  },
  {
    id: "line-medium-numeric",
    label: "Medium — 20 numeric ticks",
    category: "medium",
    payload: {
      title: "Latency over time",
      xlabel: "Sample",
      ylabel: "ms",
      series: [
        { name: "p50", data: ramp(11, CATEGORY_COUNT.medium, 40, 30) },
        { name: "p95", data: ramp(12, CATEGORY_COUNT.medium, 120, 80) },
        { name: "p99", data: ramp(13, CATEGORY_COUNT.medium, 220, 180) },
      ],
    },
  },
  {
    id: "line-large-numeric",
    label: "Large — 120 numeric ticks",
    category: "large",
    payload: {
      title: "Throughput over 2 hours",
      xlabel: "Minute",
      ylabel: "req/s",
      series: [
        { name: "ingress", data: ramp(21, CATEGORY_COUNT.large, 800, 400) },
        { name: "egress", data: ramp(22, CATEGORY_COUNT.large, 600, 300) },
      ],
    },
  },
  {
    id: "line-edge-labels",
    label: "Edge — long categorical labels",
    category: "edgeLabels",
    payload: {
      title: "Conversion by funnel stage",
      xlabel: "Stage",
      ylabel: "Users",
      series: [
        {
          name: "Cohort A",
          data: [
            { x: "Landing page visited", y: 12_400 },
            { x: "Pricing page visited", y: 6_120 },
            { x: "Signup form started", y: 2_410 },
            { x: "Signup form completed", y: 1_780 },
            { x: "Onboarding finished", y: 1_140 },
          ],
        },
      ],
    },
  },
  {
    id: "line-negatives",
    label: "Negatives — P&L month-over-month",
    category: "negatives",
    payload: {
      title: "Cash flow (USD k)",
      xlabel: "Month",
      ylabel: "Net",
      series: [
        {
          name: "Net cash flow",
          data: [
            { x: "Jan", y: 12 },
            { x: "Feb", y: -8 },
            { x: "Mar", y: 4 },
            { x: "Apr", y: 18 },
            { x: "May", y: -22 },
            { x: "Jun", y: 7 },
            { x: "Jul", y: 0 },
            { x: "Aug", y: 11 },
          ],
        },
      ],
    },
  },
  {
    id: "line-multi-series",
    label: "Multi-series — 6 series, 20 pts",
    category: "multiSeries",
    payload: {
      title: "Latency by region",
      xlabel: "Sample",
      ylabel: "ms",
      series: range(6).map((s) => ({
        name: ["us-east", "us-west", "eu-west", "eu-north", "ap-south", "ap-east"][s]!,
        data: ramp(30 + s, CATEGORY_COUNT.medium, 80 + s * 25, 60),
      })),
    },
  },
];

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}
