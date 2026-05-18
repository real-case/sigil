import type { PieChartPayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

export const pieDatasets: Dataset<PieChartPayload>[] = [
  {
    id: "pie-minimal-two",
    label: "Minimal — 2 slices",
    category: "minimal",
    payload: {
      title: "Browser share",
      variant: "pie",
      data: [
        { label: "Chromium", value: 78 },
        { label: "Other", value: 22 },
      ],
    },
  },
  {
    id: "pie-small-donut",
    label: "Small — donut 5 slices",
    category: "small",
    payload: {
      title: "Traffic source",
      variant: "donut",
      data: [
        { label: "Organic", value: 4200 },
        { label: "Direct", value: 2800 },
        { label: "Referral", value: 1600 },
        { label: "Paid", value: 1100 },
        { label: "Social", value: 700 },
      ],
    },
  },
  {
    id: "pie-medium",
    label: "Medium — 12 slices",
    category: "medium",
    payload: {
      title: "Cost by service",
      variant: "pie",
      data: [
        { label: "Compute", value: 18200 },
        { label: "Storage", value: 9100 },
        { label: "Egress", value: 7400 },
        { label: "Database", value: 6900 },
        { label: "Cache", value: 3200 },
        { label: "Observability", value: 2800 },
        { label: "Queues", value: 2100 },
        { label: "CDN", value: 1850 },
        { label: "Search", value: 1400 },
        { label: "ML inference", value: 1200 },
        { label: "Backups", value: 900 },
        { label: "Misc", value: 650 },
      ],
    },
  },
  {
    id: "pie-edge-labels",
    label: "Edge — long slice labels",
    category: "edgeLabels",
    payload: {
      title: "Revenue by product line",
      variant: "donut",
      data: [
        { label: "Enterprise Self-Hosted Annual Subscription", value: 412 },
        { label: "Enterprise Cloud Annual Subscription", value: 318 },
        { label: "Professional Services & Implementation", value: 142 },
        { label: "Training and Certification Programs", value: 78 },
        { label: "Marketplace Add-on Licenses", value: 46 },
      ],
    },
  },
  {
    id: "pie-large-imbalanced",
    label: "Large — 1 dominant slice",
    category: "large",
    payload: {
      title: "Outbound traffic by host",
      variant: "pie",
      data: [
        { label: "primary-edge", value: 92_400 },
        { label: "fallback-edge-1", value: 2_200 },
        { label: "fallback-edge-2", value: 1_800 },
        { label: "fallback-edge-3", value: 1_400 },
        { label: "fallback-edge-4", value: 1_100 },
        { label: "fallback-edge-5", value: 950 },
        { label: "internal-mirror", value: 680 },
      ],
    },
  },
];
