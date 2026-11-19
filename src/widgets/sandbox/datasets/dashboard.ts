import type { DashboardPayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";
import { payloadById } from "../../shared/storybook/from-datasets.js";
import { barDatasets } from "./bar.js";
import { lineDatasets } from "./line.js";
import { pieDatasets } from "./pie.js";
import { scatterDatasets } from "./scatter.js";
import { statPanelDatasets } from "./stat-panel.js";
import { tableDatasets } from "./table.js";
import { mapDatasets } from "./map.js";
import { sankeyDatasets } from "./sankey.js";
import { heatmapDatasets } from "./heatmap.js";
import { funnelDatasets } from "./funnel.js";
import { distributionDatasets } from "./distribution.js";
import { timelineDatasets } from "./timeline.js";
import { infoCardDatasets } from "./info-card.js";

// Dashboard presets reuse other widgets' catalog payloads verbatim, so a tile
// renders exactly like that widget's own story. The one exception is
// `dashboard-degraded`, whose broken tiles are inline literals — no catalog
// carries an invalid payload, and that preset exists to show the error cards.
export const dashboardDatasets: Dataset<DashboardPayload>[] = [
  {
    id: "dashboard-minimal",
    label: "Minimal — KPI row + 2 charts",
    category: "minimal",
    payload: {
      title: "Weekly overview",
      columns: 2,
      tiles: [
        {
          type: "stat-panel",
          payload: payloadById(statPanelDatasets, "stat-small"),
          colSpan: 2,
        },
        { type: "bar-chart", payload: payloadById(barDatasets, "bar-small-vertical") },
        { type: "line-chart", payload: payloadById(lineDatasets, "line-small-categorical") },
      ],
    },
  },
  {
    id: "dashboard-overview",
    label: "Overview — KPIs + 4 charts",
    category: "multiSeries",
    payload: {
      title: "Product analytics",
      columns: 2,
      tiles: [
        {
          type: "stat-panel",
          payload: payloadById(statPanelDatasets, "stat-rich"),
          colSpan: 2,
        },
        { type: "line-chart", payload: payloadById(lineDatasets, "line-multi-series") },
        { type: "bar-chart", payload: payloadById(barDatasets, "bar-medium-vertical") },
        { type: "pie-chart", payload: payloadById(pieDatasets, "pie-medium") },
        { type: "scatter-chart", payload: payloadById(scatterDatasets, "scatter-medium") },
        {
          type: "table",
          payload: payloadById(tableDatasets, "table-sparklines"),
          colSpan: 2,
        },
      ],
    },
  },
  {
    id: "dashboard-flow",
    label: "Flow — sankey full-width + narrow",
    category: "nested",
    // Carries the sankey twice on purpose: full-width is how a flow diagram is
    // normally placed, while the second tile takes the default colSpan 1 — the
    // tight case where node labels have the least room.
    payload: {
      title: "Acquisition funnel",
      columns: 2,
      tiles: [
        {
          type: "stat-panel",
          payload: payloadById(statPanelDatasets, "stat-small"),
          colSpan: 2,
        },
        {
          type: "sankey",
          payload: payloadById(sankeyDatasets, "sankey-small"),
          colSpan: 2,
        },
        { type: "sankey", payload: payloadById(sankeyDatasets, "sankey-minimal") },
        { type: "pie-chart", payload: payloadById(pieDatasets, "pie-medium") },
      ],
    },
  },
  {
    id: "dashboard-geo",
    label: "Geo — KPIs + map + charts",
    category: "nested",
    payload: {
      title: "Regional overview",
      columns: 2,
      tiles: [
        {
          type: "stat-panel",
          payload: payloadById(statPanelDatasets, "stat-small"),
          colSpan: 2,
        },
        { type: "map", payload: payloadById(mapDatasets, "map-medium"), colSpan: 2 },
        { type: "bar-chart", payload: payloadById(barDatasets, "bar-small-vertical") },
        { type: "pie-chart", payload: payloadById(pieDatasets, "pie-medium") },
      ],
    },
  },
  {
    id: "dashboard-degraded",
    label: "Degraded — one bad tile must cost one tile",
    category: "degraded",
    // The one preset whose tiles are written inline rather than pulled from a
    // catalog: no catalog holds an invalid payload, and the point here is the
    // failure cards. Each broken tile sits beside a healthy one so the blast
    // radius is visible at a glance — before this widget guarded its tiles, any
    // single row below took the whole dashboard down with it.
    payload: {
      title: "Degraded tiles",
      columns: 2,
      tiles: [
        { type: "bar-chart", payload: payloadById(barDatasets, "bar-small-vertical") },
        // Passes the dashboard guard (object payload) but fails the bar-chart's.
        {
          type: "bar-chart",
          payload: { title: "Missing data", orientation: "vertical" },
        },
        { type: "pie-chart", payload: payloadById(pieDatasets, "pie-medium") },
        // No widget of this type — the version-skew case.
        { type: "combo-chart", payload: { title: "From a newer server" } },
        { type: "line-chart", payload: payloadById(lineDatasets, "line-small-categorical") },
        // Dashboards are deliberately not tileable; distinct copy from "unknown".
        { type: "dashboard", payload: { title: "Inner", tiles: [] } },
      ],
    },
  },
  {
    id: "dashboard-red-sections",
    label: "Sections — service health (RED template) with provenance",
    category: "nested",
    payload: {
      title: "Checkout service health",
      columns: 3,
      source: "Prometheus, prod-eu",
      asOf: "Nov 18, 23:59 UTC",
      note: "Synthetic checks excluded.",
      tiles: [
        {
          section: "Overview",
          tiles: [
            {
              type: "stat-panel",
              colSpan: 3,
              payload: {
                title: "Rate, errors, duration",
                items: [
                  { label: "Request rate", value: 1_284, unit: "req/s", delta: 4.2, trend: [1100, 1150, 1210, 1190, 1240, 1284] },
                  { label: "Error rate", value: 0.42, unit: "%", delta: 0.11, deltaUnit: "pp", higherIsBetter: false, status: "warning", trend: [0.2, 0.25, 0.3, 0.6, 0.5, 0.42] },
                  { label: "p95 latency", value: 312, unit: "ms", delta: -3.5, higherIsBetter: false, trend: [340, 330, 335, 320, 318, 312] },
                ],
              },
            },
          ],
        },
        {
          section: "Latency",
          description: "Where response times sit, and when the service was degraded.",
          tiles: [
            { type: "distribution", payload: payloadById(distributionDatasets, "distribution-latency"), colSpan: 2, note: "One request per sample." },
            { type: "info-card", payload: payloadById(infoCardDatasets, "info-card-gauge") },
            { type: "timeline", payload: payloadById(timelineDatasets, "timeline-state"), colSpan: 3, source: "Status page" },
          ],
        },
      ],
    },
  },
  {
    id: "dashboard-product-template",
    label: "Sections — product analytics template (KPI → trend → funnel → retention)",
    category: "multiSeries",
    payload: {
      title: "Product analytics, October",
      columns: 2,
      source: "Amplitude export",
      asOf: "2026-11-01",
      tiles: [
        {
          section: "Engagement",
          tiles: [
            { type: "stat-panel", payload: payloadById(statPanelDatasets, "stat-small"), colSpan: 2 },
            { type: "line-chart", payload: payloadById(lineDatasets, "line-reference-annotations"), colSpan: 2 },
          ],
        },
        {
          section: "Conversion and retention",
          tiles: [
            { type: "funnel", payload: payloadById(funnelDatasets, "funnel-small") },
            { type: "heatmap", payload: payloadById(heatmapDatasets, "heatmap-cohort-retention"), note: "Paid plans only." },
            { type: "heatmap", payload: payloadById(heatmapDatasets, "heatmap-calendar-year"), colSpan: 2 },
          ],
        },
      ],
    },
  },
];
