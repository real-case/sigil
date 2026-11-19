import { TimelineView } from "./TimelineView.js";
import { isTimelinePayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-timeline",
  isPayload: isTimelinePayload,
  View: TimelineView,
  loadingVariant: "bar",
});
