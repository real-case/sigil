import { ScatterChartView } from "./ScatterChartView.js";
import { isScatterChartPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-scatter-chart",
  isPayload: isScatterChartPayload,
  View: ScatterChartView,
  loadingVariant: "scatter",
});
