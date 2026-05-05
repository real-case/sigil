import { EmptyStateView } from "./EmptyStateView.js";
import type { EmptyStatePayload } from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

function isEmptyStatePayload(value: unknown): value is EmptyStatePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v["title"] === "string" && typeof v["message"] === "string";
}

mountWidget({
  name: "sigil-empty-state",
  isPayload: isEmptyStatePayload,
  View: EmptyStateView,
});
