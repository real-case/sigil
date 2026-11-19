import { DistributionView } from "./DistributionView.js";
import { isDistributionPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-distribution",
  isPayload: isDistributionPayload,
  View: DistributionView,
  loadingVariant: "bar",
});
