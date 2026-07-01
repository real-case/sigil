import { MapView } from "./MapView.js";
import type { MapPayload, MapRegionDatum, MapPoint } from "../../shared/payloads.js";
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

function isMapPoint(value: unknown): value is MapPoint {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["lat"] === "number" &&
    typeof v["lon"] === "number" &&
    typeof v["value"] === "number"
  );
}

export function isMapPayload(value: unknown): value is MapPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v["title"] !== "string") return false;
  const hasData = Array.isArray(v["data"]) && v["data"].every(isMapRegionDatum);
  const hasPoints = Array.isArray(v["points"]) && v["points"].every(isMapPoint);
  return hasData || hasPoints;
}

mountWidget({
  name: "sigil-map",
  isPayload: isMapPayload,
  View: MapView,
  loadingVariant: "generic",
});
