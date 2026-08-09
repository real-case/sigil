import { PieChartView } from "./PieChartView.js";
import { isPieChartPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-pie-chart",
  isPayload: isPieChartPayload,
  View: PieChartView,
  loadingVariant: "pie",
});
