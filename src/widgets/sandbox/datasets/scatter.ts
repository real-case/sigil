import type { ScatterChartPayload, ScatterDatum } from "../../../shared/payloads.js";
import { CATEGORY_COUNT, type Dataset } from "./types.js";

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function det(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280;
  return x - Math.floor(x);
}

function cluster(seed: number, n: number, cx: number, cy: number, spread: number): ScatterDatum[] {
  return range(n).map((i) => ({
    x: Math.round((cx + (det(seed, i) - 0.5) * spread) * 100) / 100,
    y: Math.round((cy + (det(seed + 1, i) - 0.5) * spread) * 100) / 100,
  }));
}

export const scatterDatasets: Dataset<ScatterChartPayload>[] = [
  {
    id: "scatter-minimal",
    label: "Minimal — 1 point",
    category: "minimal",
    payload: {
      title: "Single measurement",
      xlabel: "x",
      ylabel: "y",
      series: [{ name: "Probe", data: [{ x: 1, y: 1 }] }],
    },
  },
  {
    id: "scatter-small",
    label: "Small — 2 series",
    category: "small",
    payload: {
      title: "A/B latency vs payload size",
      xlabel: "Payload (KB)",
      ylabel: "Latency (ms)",
      series: [
        { name: "control", data: cluster(41, CATEGORY_COUNT.small, 50, 80, 40) },
        { name: "variant", data: cluster(42, CATEGORY_COUNT.small, 50, 65, 40) },
      ],
    },
  },
  {
    id: "scatter-medium",
    label: "Medium — 20 pts × 2 series",
    category: "medium",
    payload: {
      title: "Throughput vs CPU",
      xlabel: "CPU (%)",
      ylabel: "Req/s",
      series: [
        { name: "node-A", data: cluster(43, CATEGORY_COUNT.medium, 60, 1200, 50) },
        { name: "node-B", data: cluster(44, CATEGORY_COUNT.medium, 45, 900, 50) },
      ],
    },
  },
  {
    id: "scatter-large",
    label: "Large — 120 pts × 3 series",
    category: "large",
    payload: {
      title: "Cluster scatter",
      xlabel: "x",
      ylabel: "y",
      series: [
        { name: "alpha", data: cluster(51, CATEGORY_COUNT.large / 3, 30, 30, 25) },
        { name: "beta", data: cluster(52, CATEGORY_COUNT.large / 3, 65, 50, 30) },
        { name: "gamma", data: cluster(53, CATEGORY_COUNT.large / 3, 45, 80, 35) },
      ],
    },
  },
  {
    id: "scatter-negatives",
    label: "Negatives — four quadrants",
    category: "negatives",
    payload: {
      title: "Correlation around origin",
      xlabel: "Δx",
      ylabel: "Δy",
      series: [
        { name: "quadrant-I", data: cluster(61, 10, 5, 5, 8) },
        { name: "quadrant-II", data: cluster(62, 10, -5, 5, 8) },
        { name: "quadrant-III", data: cluster(63, 10, -5, -5, 8) },
        { name: "quadrant-IV", data: cluster(64, 10, 5, -5, 8) },
      ],
    },
  },
  {
    id: "scatter-multi-series",
    label: "Multi-series — 6 series",
    category: "multiSeries",
    payload: {
      title: "Per-region telemetry",
      xlabel: "p50 (ms)",
      ylabel: "Error rate (%)",
      series: range(6).map((s) => ({
        name: ["us-east", "us-west", "eu-west", "eu-north", "ap-south", "ap-east"][s]!,
        data: cluster(70 + s, 12, 80 + s * 20, 0.5 + s * 0.4, 18),
      })),
    },
  },
];
