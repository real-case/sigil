import { LineChartView } from "./LineChartView.js";
import { isLineChartPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-line-chart",
  isPayload: isLineChartPayload,
  View: LineChartView,
  loadingVariant: "line",
});
