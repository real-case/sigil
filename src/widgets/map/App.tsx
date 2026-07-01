import { MapView } from "./MapView.js";
import type { MapPayload, MapRegionDatum } from "../../shared/payloads.js";
import { mountWidget } from "../shared/widget-shell.js";

function isMapRegionDatum(value: unknown): value is MapRegionDatum {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    v["id"].length > 0 &&
    typeof v["value"] === "number"
  );
}

export function isMapPayload(value: unknown): value is MapPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isMapRegionDatum)
  );
}

mountWidget({
  name: "sigil-map",
  isPayload: isMapPayload,
  View: MapView,
  loadingVariant: "generic",
});
