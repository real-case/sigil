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
];
