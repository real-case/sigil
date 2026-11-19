// The payload types every widget and tool imports.
//
// Definitions live in `schemas.ts`, derived from the zod schema each tool
// registers, so a field cannot mean one thing to the server and another to the
// widget. This module stays as the import surface because most of the codebase
// already points here, and because a type-only re-export is erased — nothing
// below reaches a widget bundle.
//
// A widget that needs to *validate* (rather than describe) imports the schema
// from `schemas.ts` directly; that is what the per-widget `guard.ts` does.

export type {
  BarChartPayload,
  BarDatum,
  BarSeries,
  BarStack,
  Orientation,
  LineChartPayload,
  LineSeries,
  LineDatum,
  LineAnnotation,
  ReferenceMark,
  ReferenceTone,
  PieChartPayload,
  PieDatum,
  PieVariant,
  ScatterChartPayload,
  ScatterSeries,
  ScatterDatum,
  TreemapPayload,
  TreemapNode,
  HeatmapPayload,
  HeatmapCell,
  HeatmapDay,
  MapPayload,
  MapRegionDatum,
  MapPoint,
  MapScope,
  MapVariant,
  SankeyPayload,
  SankeyNode,
  SankeyLink,
  FunnelPayload,
  FunnelStep,
  InfoCardPayload,
  InfoCardItem,
  InfoCardVariant,
  DistributionPayload,
  DistributionGroup,
  BoxSummary,
  HistogramBin,
  TimelinePayload,
  TimelineItem,
  TimelineMilestone,
  TimelineState,
  StateTone,
  StatPanelPayload,
  StatItem,
  StatStatus,
  TablePayload,
  TableColumn,
  TableRow,
  TableCell,
  ColumnAlign,
  ColumnKind,
  DashboardPayload,
  DashboardTile,
  DashboardSection,
  DashboardEntry,
  DashboardTileType,
} from "./schemas.js";

export { DASHBOARD_TILE_TYPES, isDashboardSection } from "./schemas.js";
