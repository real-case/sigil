import { FunnelView } from "./FunnelView.js";
import { isFunnelPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-funnel",
  isPayload: isFunnelPayload,
  View: FunnelView,
  loadingVariant: "bar",
});
