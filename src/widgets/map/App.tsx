import { MapView } from "./MapView.js";
import { isMapPayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-map",
  isPayload: isMapPayload,
  View: MapView,
  loadingVariant: "generic",
});
