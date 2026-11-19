import type { WidgetKey } from "../widgets/sandbox/datasets/index.js";

// Marketing copy for each widget on the gallery. Keyed by the sandbox's
// `WidgetKey` union, so adding a widget there fails typecheck here until it
// gets a tool name, a prompt and a featured preset.
export interface WidgetMeta {
  /** MCP tool the host calls. */
  tool: string;
  /** One line: when an assistant reaches for this widget. */
  when: string;
  /** A plausible user prompt that would make the assistant call the tool. */
  prompt: string;
  /** Sandbox dataset id shown first. */
  featured: string;
}

export const WIDGET_META: Record<WidgetKey, WidgetMeta> = {
  "bar-chart": {
    tool: "render_bar_chart",
    when: "Comparing discrete categories and rankings.",
    prompt: "Compare revenue by region for last quarter.",
    featured: "bar-small-horizontal",
  },
  "line-chart": {
    tool: "render_line_chart",
    when: "Time series, trends and any continuous data.",
    prompt: "Chart p95 latency for each region over the last 20 days.",
    featured: "line-multi-series",
  },
  "pie-chart": {
    tool: "render_pie_chart",
    when: "Part-of-whole proportions with a handful of slices.",
    prompt: "What does our traffic mix look like by source?",
    featured: "pie-small-donut",
  },
  table: {
    tool: "render_table",
    when: "Structured rows to sort, filter and scan — with inline sparklines.",
    prompt: "List our services with a 12-week traffic trend.",
    featured: "table-sparklines",
  },
  "scatter-chart": {
    tool: "render_scatter_chart",
    when: "Relationships, correlation and clusters between two measures.",
    prompt: "Cluster these customers by spend and engagement.",
    featured: "scatter-large",
  },
  heatmap: {
    tool: "render_heatmap",
    when: "Intensity across two categorical axes.",
    prompt: "When during the week does traffic peak?",
    featured: "heatmap-medium",
  },
  treemap: {
    tool: "render_treemap",
    when: "Hierarchical part-of-whole with many leaves.",
    prompt: "Break down headcount across the org.",
    featured: "treemap-nested",
  },
  "stat-panel": {
    tool: "render_stat_panel",
    when: "KPIs and scorecards, at a glance.",
    prompt: "How is the team tracking against this month's targets?",
    featured: "stat-rich",
  },
  sankey: {
    tool: "render_sankey",
    when: "Flows from source to destination: budgets, journeys, traffic.",
    prompt: "Where does this year's budget actually go?",
    featured: "sankey-medium",
  },
  dashboard: {
    tool: "render_dashboard",
    when: "Several related views in one grid — any widget can be a tile.",
    prompt: "Build me a one-screen product analytics overview.",
    featured: "dashboard-overview",
  },
  map: {
    tool: "render_map",
    when: "Country- or state-level metrics, choropleth or bubbles.",
    prompt: "Map internet adoption by country.",
    featured: "map-medium",
  },
};
