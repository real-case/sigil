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
  {
    id: "heatmap-diverging",
    label: "Negatives — diverging, % vs plan",
    category: "negatives",
    payload: {
      title: "Revenue vs plan by region and month (%)",
      xlabel: "Month",
      ylabel: "Region",
      xLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      yLabels: ["North", "South", "East", "West", "Central"],
      // Asymmetric on purpose (−12 … +28): the short negative arm must stay
      // short instead of stretching to the darkest blue.
      cells: denseGrid(31, 6, 5).map((c) => ({ ...c, value: Math.round(c.value * 0.4 - 12) })),
      scale: "diverging",
      midpoint: 0,
    },
  },
  {
    id: "heatmap-cohort-retention",
    label: "Cohort — monthly retention, weighted average",
    category: "medium",
    payload: cohortRetention(),
  },
  {
    id: "heatmap-cohort-nrr",
    label: "Cohort — net revenue retention above 100%, no sizes",
    category: "edgeLabels",
    payload: {
      title: "Net revenue retention by signup quarter",
      mode: "cohort",
      xLabels: ["Q0", "Q1", "Q2", "Q3", "Q4"],
      yLabels: ["2025 Q3", "2025 Q4", "2026 Q1", "2026 Q2", "2026 Q3"],
      cells: [
        [100, 104, 109, 113, 118],
        [100, 101, 106, 110],
        [100, 97, 99],
        [100, 103],
        [100],
      ].flatMap((row, y) => row.map((value, x) => ({ x, y, value }))),
      xlabel: "Quarters since signup",
      ylabel: "Signup quarter",
    },
  },
];

// A triangular retention table: each monthly cohort decays at its own pace and
// has only lived through the months since it signed up.
function cohortRetention(): HeatmapPayload {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const sizes = [1840, 2120, 1960, 2410, 2780, 2350, 3010, 3320, 2890, 3540];
  const periods = months.length;
  const cells: HeatmapPayload["cells"] = [];
  months.forEach((_, y) => {
    const floor = 18 + (y % 4) * 2.5;
    for (let x = 0; x < periods - y; x++) {
      const value = x === 0 ? 100 : floor + (100 - floor) * Math.exp(-0.9 * x) - x * 0.4;
      cells.push({ x, y, value: Math.round(value * 10) / 10 });
    }
  });
  return {
    title: "Monthly retention by signup cohort, 2026",
    mode: "cohort",
    xLabels: Array.from({ length: periods }, (_, i) => `M${i}`),
    yLabels: months.map((m) => `${m} 2026`),
    cohortSizes: sizes,
    cells,
    xlabel: "Months since signup",
    ylabel: "Signup cohort",
  };
}
