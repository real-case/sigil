import { BarChartView } from "./BarChartView.js";
import { isBarChartPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-bar-chart",
  isPayload: isBarChartPayload,
  View: BarChartView,
  loadingVariant: "bar",
});
