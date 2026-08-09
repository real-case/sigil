import type { ComponentType } from "react";
import type { DashboardTileType } from "../../shared/payloads.js";
import { BarChartView } from "../bar-chart/BarChartView.js";
import { isBarChartPayload } from "../bar-chart/guard.js";
import { LineChartView } from "../line-chart/LineChartView.js";
import { isLineChartPayload } from "../line-chart/guard.js";
import { PieChartView } from "../pie-chart/PieChartView.js";
import { isPieChartPayload } from "../pie-chart/guard.js";
import { TableView } from "../table/TableView.js";
import { isTablePayload } from "../table/guard.js";
import { ScatterChartView } from "../scatter-chart/ScatterChartView.js";
import { isScatterChartPayload } from "../scatter-chart/guard.js";
import { TreemapView } from "../treemap/TreemapView.js";
import { isTreemapPayload } from "../treemap/guard.js";
import { HeatmapView } from "../heatmap/HeatmapView.js";
import { isHeatmapPayload } from "../heatmap/guard.js";
import { StatPanelView } from "../stat-panel/StatPanelView.js";
import { isStatPanelPayload } from "../stat-panel/guard.js";
import { SankeyView } from "../sankey/SankeyView.js";
import { isSankeyPayload } from "../sankey/guard.js";
import { MapView } from "../map/MapView.js";
import { isMapPayload } from "../map/guard.js";

// Production map of widget type → { View, payload guard }, used by the dashboard
// widget to render child tiles. Imports only `*View` and `guard` modules — both
// side-effect free — never the `App.tsx` entries, which call `mountWidget` on
// import. The dashboard itself is intentionally absent (no dashboard-in-dashboard).
//
// The guard travels with the View because a tile's payload bypasses the tool
// schema entirely (`render_dashboard` types it as an opaque record), so the only
// place an invalid tile payload can be caught is here, before the View renders.
type AnyView = ComponentType<{ payload: never }>;

export interface WidgetViewEntry {
  View: AnyView;
  isPayload: (value: unknown) => boolean;
}

export const WIDGET_VIEWS: Record<DashboardTileType, WidgetViewEntry> = {
  "bar-chart": { View: BarChartView as unknown as AnyView, isPayload: isBarChartPayload },
  "line-chart": { View: LineChartView as unknown as AnyView, isPayload: isLineChartPayload },
  "pie-chart": { View: PieChartView as unknown as AnyView, isPayload: isPieChartPayload },
  table: { View: TableView as unknown as AnyView, isPayload: isTablePayload },
  "scatter-chart": {
    View: ScatterChartView as unknown as AnyView,
    isPayload: isScatterChartPayload,
  },
  treemap: { View: TreemapView as unknown as AnyView, isPayload: isTreemapPayload },
  heatmap: { View: HeatmapView as unknown as AnyView, isPayload: isHeatmapPayload },
  "stat-panel": { View: StatPanelView as unknown as AnyView, isPayload: isStatPanelPayload },
  sankey: { View: SankeyView as unknown as AnyView, isPayload: isSankeyPayload },
  map: { View: MapView as unknown as AnyView, isPayload: isMapPayload },
};

/**
 * Resolve a tile type to its entry, or `undefined` when nothing renders it.
 *
 * The own-property check is load-bearing, not defensive style: `WIDGET_VIEWS` is
 * a plain object literal, so a bare index answers `WIDGET_VIEWS["toString"]`
 * with a truthy inherited function. A caller would then treat it as an entry and
 * throw on `entry.isPayload(...)` — above the tile boundary, taking the whole
 * dashboard with it.
 */
export function lookupWidgetView(type: string): WidgetViewEntry | undefined {
  return Object.hasOwn(WIDGET_VIEWS, type)
    ? WIDGET_VIEWS[type as DashboardTileType]
    : undefined;
}
