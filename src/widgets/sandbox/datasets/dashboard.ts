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

// Dashboard presets reuse other widgets' catalog payloads verbatim, so a tile
// renders exactly like that widget's own story.
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
];
