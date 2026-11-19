import { InfoCardView } from "./InfoCardView.js";
import { isInfoCardPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-info-card",
  isPayload: isInfoCardPayload,
  View: InfoCardView,
  loadingVariant: "generic",
});
