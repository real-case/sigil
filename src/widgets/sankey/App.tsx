import { SankeyView } from "./SankeyView.js";
import { isSankeyPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-sankey",
  isPayload: isSankeyPayload,
  View: SankeyView,
  loadingVariant: "sankey",
});
