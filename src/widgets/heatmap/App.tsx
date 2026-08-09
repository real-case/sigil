import { HeatmapView } from "./HeatmapView.js";
import { isHeatmapPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-heatmap",
  isPayload: isHeatmapPayload,
  View: HeatmapView,
  loadingVariant: "heatmap",
});
