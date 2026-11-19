import type { FunnelPayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

export const funnelDatasets: Dataset<FunnelPayload>[] = [
  {
    id: "funnel-minimal",
    label: "Minimal — 1 stage",
    category: "minimal",
    payload: {
      title: "Landing-page visits",
      valueLabel: "visits",
      steps: [{ label: "Visited", value: 12_400 }],
    },
  },
  {
    id: "funnel-small",
    label: "Small — 5-stage signup funnel",
    category: "small",
    payload: {
      title: "Signup funnel, October",
      valueLabel: "users",
      steps: [
        { label: "Visited site", value: 48_200 },
        { label: "Viewed pricing", value: 17_900, conversionTime: "4 min" },
        { label: "Started signup", value: 6_420, conversionTime: "11 min" },
        { label: "Verified email", value: 4_870, conversionTime: "2.1 h" },
        { label: "First project", value: 1_310, conversionTime: "1.6 days" },
      ],
    },
  },
  {
    id: "funnel-medium-vertical",
    label: "Medium — 8 stages, vertical",
    category: "medium",
    payload: {
      title: "B2B sales pipeline, Q3",
      valueLabel: "deals",
      orientation: "vertical",
      steps: [
        { label: "Lead", value: 2_400 },
        { label: "MQL", value: 1_180 },
        { label: "SQL", value: 640 },
        { label: "Discovery", value: 410 },
        { label: "Demo", value: 300 },
        { label: "Proposal", value: 162 },
        { label: "Negotiation", value: 96 },
        { label: "Closed won", value: 41 },
      ],
      followUps: ["Break down by sales region", "Compare with Q2", "Show deals lost here"],
    },
  },
  {
    id: "funnel-edge-labels",
    label: "Edge — long stage names",
    category: "edgeLabels",
    payload: {
      title: "Mobile onboarding completion by step, all platforms",
      steps: [
        { label: "Opened the app for the very first time after install", value: 90_000 },
        { label: "Granted notification permission on the system prompt", value: 51_000 },
        { label: "Completed the interactive product tour", value: 33_500 },
        { label: "Connected a calendar or e-mail account", value: 12_100 },
      ],
    },
  },
  {
    id: "funnel-degraded-growth",
    label: "Degraded — a step grows, a step is zero",
    category: "degraded",
    payload: {
      title: "Checkout with re-entries",
      valueLabel: "sessions",
      steps: [
        { label: "Cart", value: 3_200 },
        { label: "Shipping", value: 2_100 },
        { label: "Payment", value: 2_350 },
        { label: "Fraud review", value: 0 },
        { label: "Confirmed", value: 0 },
      ],
    },
  },
];
