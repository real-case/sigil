import { StatPanelView } from "./StatPanelView.js";
import { isStatPanelPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-stat-panel",
  isPayload: isStatPanelPayload,
  View: StatPanelView,
  loadingVariant: "generic",
});
