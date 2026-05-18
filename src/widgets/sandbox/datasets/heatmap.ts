import type { HeatmapPayload, HeatmapCell } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

function det(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280;
  return x - Math.floor(x);
}

function denseGrid(seed: number, nx: number, ny: number): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      cells.push({ x, y, value: Math.round(det(seed, y * nx + x) * 100) });
    }
  }
  return cells;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const DAYS_7 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const heatmapDatasets: Dataset<HeatmapPayload>[] = [
  {
    id: "heatmap-minimal",
    label: "Minimal — 2 × 2",
    category: "minimal",
    payload: {
      title: "Sanity grid",
      xLabels: ["A", "B"],
      yLabels: ["1", "2"],
      cells: [
        { x: 0, y: 0, value: 10 },
        { x: 1, y: 0, value: 20 },
        { x: 0, y: 1, value: 30 },
        { x: 1, y: 1, value: 40 },
      ],
    },
  },
  {
    id: "heatmap-small",
    label: "Small — 5 × 5",
    category: "small",
    payload: {
      title: "Correlation matrix",
      xLabels: ["A", "B", "C", "D", "E"],
      yLabels: ["A", "B", "C", "D", "E"],
      cells: denseGrid(81, 5, 5),
    },
  },
  {
    id: "heatmap-medium",
    label: "Medium — 7 × 24 (week × hours)",
    category: "medium",
    payload: {
      title: "Traffic by hour of day",
      xlabel: "Hour",
      ylabel: "Day",
      xLabels: HOURS_24,
      yLabels: DAYS_7,
      cells: denseGrid(82, 24, 7),
    },
  },
  {
    id: "heatmap-large",
    label: "Large — 30 × 12",
    category: "large",
    payload: {
      title: "Calendar heatmap (month × day)",
      xlabel: "Day",
      ylabel: "Month",
      xLabels: Array.from({ length: 30 }, (_, i) => String(i + 1)),
      yLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      cells: denseGrid(83, 30, 12),
    },
  },
  {
    id: "heatmap-edge-labels",
    label: "Edge — long axis labels",
    category: "edgeLabels",
    payload: {
      title: "API → consumer matrix",
      xlabel: "Consumer",
      ylabel: "API endpoint",
      xLabels: [
        "web-dashboard-prod",
        "mobile-ios-prod",
        "mobile-android-prod",
        "partner-integration-zapier",
        "partner-integration-segment",
      ],
      yLabels: [
        "POST /api/v2/users",
        "GET /api/v2/users/:id",
        "POST /api/v2/sessions",
        "DELETE /api/v2/sessions/:id",
        "GET /api/v2/billing/invoices",
        "POST /api/v2/billing/checkout",
      ],
      cells: denseGrid(84, 5, 6),
    },
  },
];
