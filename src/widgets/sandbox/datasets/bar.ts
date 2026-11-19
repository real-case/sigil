import type { BarChartPayload, BarSeries } from "../../../shared/payloads.js";
import { CATEGORY_COUNT, type Dataset } from "./types.js";

const QUARTERS = ["Q1 '23", "Q2 '23", "Q3 '23", "Q4 '23", "Q1 '24"];
const REGIONS = ["North America", "Europe", "Asia-Pacific"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

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
  {
    id: "bar-reference-target",
    label: "Annotated — target line + goal band",
    category: "annotated",
    payload: {
      title: "Weekly signups vs target",
      orientation: "vertical",
      xlabel: "Week",
      ylabel: "Signups",
      data: [
        { label: "W1", value: 410 },
        { label: "W2", value: 455 },
        { label: "W3", value: 388 },
        { label: "W4", value: 520 },
        { label: "W5", value: 610 },
        { label: "W6", value: 575 },
      ],
      reference: [
        { axis: "y", kind: "line", value: 500, label: "Target 500", tone: "success" },
        { axis: "y", kind: "band", from: 0, to: 400, label: "Below plan", tone: "warning" },
      ],
    },
  },
  {
    id: "bar-series-grouped",
    label: "Multi-series — grouped (region × quarter)",
    category: "multiSeries",
    payload: {
      title: "Revenue by region and quarter",
      xlabel: "Quarter",
      ylabel: "USD",
      stack: "none",
      series: REGIONS.map((name, s) => ({
        name,
        data: QUARTERS.slice(0, 4).map((label, i) => ({
          label,
          value: Math.round(4000 + s * 1800 + i * 900 + deterministicWiggle(s + 1, i) * 1500),
        })),
      })),
    },
  },
  {
    id: "bar-series-stacked",
    label: "Multi-series — stacked",
    category: "multiSeries",
    payload: {
      title: "Revenue by region and quarter",
      xlabel: "Quarter",
      ylabel: "USD",
      stack: "normal",
      series: REGIONS.map((name, s) => ({
        name,
        data: QUARTERS.map((label, i) => ({
          label,
          value: Math.round(4000 + s * 1800 + i * 900 + deterministicWiggle(s + 1, i) * 1500),
        })),
      })),
      reference: [{ axis: "y", kind: "line", value: 30_000, label: "Plan", tone: "neutral" }],
    },
  },
  {
    id: "bar-series-percent",
    label: "Multi-series — 100% stacked",
    category: "multiSeries",
    payload: {
      title: "Traffic mix by channel",
      xlabel: "Month",
      stack: "percent",
      series: ["Organic", "Paid", "Referral", "Email"].map((name, s) => ({
        name,
        data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((label, i) => ({
          label,
          value: Math.round((4 - s) * 1000 + deterministicWiggle(s + 7, i) * 1600),
        })),
      })),
    },
  },
  {
    id: "bar-series-horizontal-stacked",
    label: "Multi-series — horizontal stacked",
    category: "multiSeries",
    payload: {
      title: "Tickets by team and priority",
      orientation: "horizontal",
      stack: "normal",
      xlabel: "Tickets",
      series: ["P1", "P2", "P3"].map((name, s) => ({
        name,
        data: ["Platform", "Billing", "Mobile", "Web", "Data"].map((label, i) => ({
          label,
          value: Math.round(4 + s * 9 + deterministicWiggle(s + 3, i) * 14),
        })),
      })),
    },
  },
  {
    id: "bar-series-diverging",
    label: "Negatives — MRR movements (diverging stack + net line)",
    category: "negatives",
    payload: {
      title: "MRR movements",
      xlabel: "Month",
      ylabel: "USD",
      stack: "normal",
      series: [
        { name: "New", values: [18_200, 21_400, 19_800, 24_100, 22_600, 26_300] },
        { name: "Expansion", values: [6_400, 7_100, 8_200, 7_700, 9_300, 10_100] },
        { name: "Contraction", values: [-3_100, -2_800, -4_200, -3_600, -3_900, -4_400] },
        { name: "Churn", values: [-8_900, -7_600, -11_200, -9_800, -8_400, -9_100] },
      ]
        .map(({ name, values }): BarSeries => ({
          name,
          data: values.map((value, i) => ({ label: MONTHS[i]!, value })),
        }))
        .concat([
          {
            name: "Net new MRR",
            mark: "line" as const,
            data: MONTHS.map((label, i) => ({
              label,
              value: [12_600, 18_100, 12_600, 18_400, 19_600, 22_900][i]!,
            })),
          },
        ]),
    },
  },
  {
    id: "bar-series-combo",
    label: "Multi-series — bars + line on a right axis",
    category: "multiSeries",
    payload: {
      title: "Revenue and gross margin",
      xlabel: "Quarter",
      ylabel: "Revenue (USD)",
      ylabelRight: "Margin %",
      series: [
        {
          name: "Revenue",
          data: QUARTERS.map((label, i) => ({ label, value: 52_000 + i * 6_500 })),
        },
        {
          name: "Gross margin %",
          mark: "line",
          axis: "right",
          data: QUARTERS.map((label, i) => ({ label, value: [61, 63, 62, 66, 68][i]! })),
        },
      ],
    },
  },
];
