import { TableView } from "./TableView.js";
import { isTablePayload } from "./guard.js";
import { mountWidget } from "../shared/widget-shell.js";

mountWidget({
  name: "sigil-table",
  isPayload: isTablePayload,
  View: TableView,
  loadingVariant: "table",
});
