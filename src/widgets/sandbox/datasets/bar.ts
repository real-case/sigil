import type { BarChartPayload } from "../../../shared/payloads.js";
import { CATEGORY_COUNT, type Dataset } from "./types.js";

const QUARTERS = ["Q1 '23", "Q2 '23", "Q3 '23", "Q4 '23", "Q1 '24"];

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function deterministicWiggle(seed: number, index: number): number {
  // Cheap deterministic pseudo-random in [0, 1) — keeps presets stable across reloads.
  const x = Math.sin(seed * 9301 + index * 49297) * 233280;
  return x - Math.floor(x);
}

export const barDatasets: Dataset<BarChartPayload>[] = [
  {
    id: "bar-minimal-single",
    label: "Minimal — single bar",
    category: "minimal",
    payload: {
      title: "Total revenue",
      orientation: "vertical",
      data: [{ label: "FY2024", value: 42_500 }],
      ylabel: "USD",
    },
  },
  {
    id: "bar-small-vertical",
    label: "Small — 5 quarters",
    category: "small",
    payload: {
      title: "Quarterly revenue",
      orientation: "vertical",
      xlabel: "Quarter",
      ylabel: "USD",
      data: QUARTERS.map((q, i) => ({ label: q, value: 8000 + i * 1500 })),
    },
  },
  {
    id: "bar-small-horizontal",
    label: "Small — horizontal (regional)",
    category: "small",
    payload: {
      title: "Revenue by region",
      orientation: "horizontal",
      xlabel: "USD",
      data: [
        { label: "North America", value: 21_400 },
        { label: "Europe", value: 14_200 },
        { label: "Asia-Pacific", value: 11_900 },
        { label: "LATAM", value: 4_300 },
        { label: "MEA", value: 2_100 },
      ],
    },
  },
  {
    id: "bar-medium-vertical",
    label: "Medium — 20 categories",
    category: "medium",
    payload: {
      title: "Page views by route",
      orientation: "vertical",
      xlabel: "Route",
      ylabel: "Views",
      data: range(CATEGORY_COUNT.medium).map((i) => ({
        label: `/path-${i + 1}`,
        value: Math.round(500 + deterministicWiggle(1, i) * 4500),
      })),
    },
  },
  {
    id: "bar-large-vertical",
    label: "Large — 120 days",
    category: "large",
    payload: {
      title: "Daily signups (4 months)",
      orientation: "vertical",
      xlabel: "Day",
      ylabel: "Signups",
      data: range(CATEGORY_COUNT.large).map((i) => ({
        label: `D${i + 1}`,
        value: Math.round(40 + deterministicWiggle(2, i) * 160),
      })),
    },
  },
  {
    id: "bar-edge-labels",
    label: "Edge — very long labels",
    category: "edgeLabels",
    payload: {
      title: "Top customer cohorts",
      orientation: "vertical",
      xlabel: "Cohort",
      ylabel: "MRR (USD)",
      data: [
        { label: "Enterprise — Manufacturing & Logistics, NA", value: 28_500 },
        { label: "Enterprise — Financial Services, EMEA", value: 22_100 },
        { label: "Mid-Market — SaaS, Global", value: 17_800 },
        { label: "Startup — Pre-Series A, Global", value: 9_400 },
        { label: "Education — Public Sector, APAC", value: 5_200 },
      ],
    },
  },
  {
    id: "bar-negatives-mixed",
    label: "Negatives — YoY deltas",
    category: "negatives",
    payload: {
      title: "Year-over-year deltas",
      orientation: "vertical",
      xlabel: "Segment",
      ylabel: "Δ USD",
      data: [
        { label: "Hardware", value: 12_400 },
        { label: "Software", value: -3_200 },
        { label: "Services", value: 4_100 },
        { label: "Subscriptions", value: 8_700 },
        { label: "One-time", value: -6_500 },
        { label: "Other", value: 0 },
      ],
    },
  },
];
