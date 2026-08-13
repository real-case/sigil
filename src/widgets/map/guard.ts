// Payload guard, kept out of App.tsx so it is importable without side effects:
// App.tsx calls mountWidget on import, which the dashboard must not trigger.
import type {
  MapPayload,
  MapRegionDatum,
  MapPoint,
  MapScope,
  MapVariant,
} from "../../shared/payloads.js";
import {
  asRecord,
  isFiniteNumber,
  isNonEmptyString,
  isOptionalArrayOf,
  isOptionalOneOf,
  isOptionalString,
} from "../shared/guards.js";

const SCOPES: readonly MapScope[] = ["world", "us-states"];
const VARIANTS: readonly MapVariant[] = ["choropleth", "bubble"];

function isMapRegionDatum(value: unknown): value is MapRegionDatum {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["id"]) &&
    isFiniteNumber(v["value"]) &&
    isOptionalString(v["label"])
  );
}

function isMapPoint(value: unknown): value is MapPoint {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isFiniteNumber(v["lat"]) &&
    isFiniteNumber(v["lon"]) &&
    isFiniteNumber(v["value"]) &&
    isOptionalString(v["label"])
  );
}

export function isMapPayload(value: unknown): value is MapPayload {
  const v = asRecord(value);
  if (!v) return false;
  return (
    isNonEmptyString(v["title"]) &&
    // Both enums were unchecked, so `scope: "moon"` reached scopeGeo, whose
    // ternary answers with the world map — a US-states request silently served
    // the wrong base map with nothing reporting it.
    isOptionalOneOf(v["scope"], SCOPES) &&
    isOptionalOneOf(v["variant"], VARIANTS) &&
    // Neither array is required: render_map({ title }) is a legal call that
    // renders the empty state, so a tile may carry the same.
    isOptionalArrayOf(v["data"], isMapRegionDatum) &&
    isOptionalArrayOf(v["points"], isMapPoint) &&
    isOptionalString(v["valueLabel"])
  );
}
