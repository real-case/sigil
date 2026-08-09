import { DashboardView } from "./DashboardView.js";
import { isDashboardPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-dashboard",
  isPayload: isDashboardPayload,
  View: DashboardView,
  loadingVariant: "generic",
});
