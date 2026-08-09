import { TreemapView } from "./TreemapView.js";
import { isTreemapPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-treemap",
  isPayload: isTreemapPayload,
  View: TreemapView,
  loadingVariant: "treemap",
});
