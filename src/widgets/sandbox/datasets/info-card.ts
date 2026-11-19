import type { InfoCardPayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

export const infoCardDatasets: Dataset<InfoCardPayload>[] = [
  {
    id: "info-card-bullet",
    label: "Bullet — KPIs against plan, with bands",
    category: "small",
    payload: {
      title: "Q3 against plan",
      variant: "bullet",
      items: [
        { label: "Revenue", value: 8.4, unit: "$M", target: 9, bands: [6, 8], max: 10 },
        { label: "New customers", value: 412, target: 380, bands: [250, 350], max: 500 },
        { label: "Gross margin", value: 71.2, unit: "%", target: 70, bands: [60, 68], min: 50, max: 80 },
        {
          label: "Support backlog",
          value: 148,
          target: 120,
          bands: [120, 180],
          max: 240,
          higherIsBetter: false,
          caption: "open tickets older than 48 h",
        },
      ],
    },
  },
  {
    id: "info-card-gauge",
    label: "Gauge — health with thresholds",
    category: "small",
    payload: {
      title: "Service health, last 30 days",
      variant: "gauge",
      items: [
        { label: "Uptime", value: 99.95, unit: "%", min: 99, max: 100, thresholds: { warn: 99.9, critical: 99.5 } },
        {
          label: "p95 latency",
          value: 412,
          unit: "ms",
          max: 800,
          thresholds: { warn: 300, critical: 600 },
          higherIsBetter: false,
        },
        { label: "CPU utilisation", value: 91, unit: "%", thresholds: { warn: 75, critical: 90 }, higherIsBetter: false },
      ],
    },
  },
  {
    id: "info-card-progress",
    label: "Progress — quota attainment",
    category: "small",
    payload: {
      title: "Quarterly quota attainment",
      variant: "progress",
      items: [
        { label: "Alice Chen", value: 312, unit: "$K", target: 300 },
        { label: "Marcus Webb", value: 241, unit: "$K", target: 300 },
        { label: "Priya Nair", value: 158, unit: "$K", target: 300, caption: "joined mid-quarter" },
      ],
    },
  },
  {
    id: "info-card-ranking",
    label: "Ranking — top accounts with rank moves",
    category: "medium",
    payload: {
      title: "Top 8 accounts by ARR",
      variant: "ranking",
      items: [
        { label: "Northwind Traders", value: 1_240, unit: "$K", rankDelta: 0 },
        { label: "Contoso Pharma", value: 1_115, unit: "$K", rankDelta: 2 },
        { label: "Fabrikam Logistics", value: 980, unit: "$K", rankDelta: -1 },
        { label: "Tailspin Air", value: 902, unit: "$K", rankDelta: -1 },
        { label: "Wingtip Retail", value: 770, unit: "$K", rankDelta: 3 },
        { label: "Litware Systems", value: 655, unit: "$K", rankDelta: 0 },
        { label: "Adventure Works", value: 610, unit: "$K", rankDelta: -2 },
        { label: "Proseware", value: 588, unit: "$K" },
      ],
    },
  },
  {
    id: "info-card-ranking-plain",
    label: "Ranking — no rank deltas",
    category: "minimal",
    payload: {
      title: "Most-used features this week",
      variant: "ranking",
      items: [
        { label: "Dashboards", value: 18_420 },
        { label: "Alerts", value: 9_310 },
        { label: "Saved queries", value: 4_102 },
      ],
    },
  },
  {
    id: "info-card-comparison",
    label: "Comparison — year over year",
    category: "small",
    payload: {
      title: "October, year over year",
      variant: "comparison",
      currentLabel: "Oct 2026",
      baselineLabel: "Oct 2025",
      items: [
        { label: "Active users", value: 48_200, baseline: 39_800 },
        { label: "Conversion", value: 3.1, unit: "%", baseline: 3.4 },
        { label: "Churn", value: 1.8, unit: "%", baseline: 2.3, higherIsBetter: false },
        { label: "Support tickets", value: 1_920, baseline: 1_920 },
      ],
    },
  },
  {
    id: "info-card-narrative",
    label: "Narrative — summary with key figures",
    category: "small",
    payload: {
      title: "What changed in October",
      variant: "narrative",
      items: [
        { label: "Revenue", value: 2.31, unit: "$M", caption: "+8% vs Sep" },
        { label: "Net retention", value: 112, unit: "%" },
      ],
      text: "Revenue grew 8% month over month, almost all of it from expansion in the three largest accounts.\n\nNew-logo bookings were flat; the pipeline for November is 20% thinner than usual, so growth next month depends on expansion again.",
    },
  },
  {
    id: "info-card-off-scale",
    label: "Edge — values outside an explicit scale",
    category: "degraded",
    payload: {
      title: "Off-scale values are pinned and flagged",
      variant: "bullet",
      items: [
        { label: "Above max", value: 135, target: 100, min: 0, max: 120, bands: [60, 90] },
        { label: "Below min", value: -12, target: 40, min: 0, max: 100 },
        { label: "Negative on a scale with zero", value: -20, target: 10, min: -50, max: 50 },
      ],
    },
  },
  {
    id: "info-card-gauge-off-scale",
    label: "Edge — gauge above its max",
    category: "degraded",
    payload: {
      title: "Error budget burn",
      variant: "gauge",
      items: [
        { label: "Burn rate", value: 3.4, unit: "×", max: 2, thresholds: { warn: 1, critical: 1.5 }, higherIsBetter: false },
      ],
    },
  },
];
