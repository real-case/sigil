// Geometry + country-id resolution for the map widget.
//
// Decodes the bundled world-atlas TopoJSON into GeoJSON features once, and
// resolves a datum's region id (ISO 3166-1 alpha-3 / alpha-2 / numeric, or a
// common English name) to the matching country feature. Kept free of React so
// MapView stays purely presentational. The projection lives in the view since
// it depends on the rendered size.

import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import worldAtlasRaw from "world-atlas/countries-110m.json";
import { COUNTRY_CODES, type CountryCode } from "./country-codes.js";

export type CountryFeature = Feature<Geometry, { name: string }>;

// world-atlas's topology typing is intentionally loose here; we cast the decode
// result to the GeoJSON shape we rely on.
const topo = worldAtlasRaw as unknown as {
  objects: { countries: unknown };
};
const decoded = feature(topo as never, topo.objects.countries as never) as unknown as {
  features: CountryFeature[];
};

// Strip combining diacritical marks (U+0300–U+036F) after NFD normalization,
// then reduce to lowercase alphanumerics so "Côte d'Ivoire" ≈ "cotedivoire".
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeCcn3(id: string | number | undefined): string {
  return String(id ?? "").padStart(3, "0");
}

// Antarctica (ccn3 010) dominates the vertical extent of a world projection and
// is rarely a data target — drop it from the base map so the fit stays tight.
export const WORLD_FEATURES: readonly CountryFeature[] = decoded.features.filter(
  (f) => normalizeCcn3(f.id) !== "010",
);

const metaByCode = new Map<string, CountryCode>();
const metaByName = new Map<string, CountryCode>();
for (const c of COUNTRY_CODES) {
  metaByCode.set(c.a3.toUpperCase(), c);
  metaByCode.set(c.a2.toUpperCase(), c);
  metaByCode.set(c.ccn3, c);
  metaByName.set(normalizeName(c.name), c);
}

const featureByCcn3 = new Map<string, CountryFeature>();
const featureByName = new Map<string, CountryFeature>();
for (const f of WORLD_FEATURES) {
  featureByCcn3.set(normalizeCcn3(f.id), f);
  featureByName.set(normalizeName(f.properties.name), f);
}

/**
 * Resolve a region id to its country feature. Accepts ISO 3166-1 alpha-3
 * (preferred), alpha-2, numeric, or a common English name. Returns null when
 * nothing matches.
 */
export function resolveFeature(rawId: string): CountryFeature | null {
  const key = rawId.trim();
  if (!key) return null;
  let meta = metaByCode.get(key.toUpperCase());
  if (!meta && /^\d+$/.test(key)) meta = metaByCode.get(normalizeCcn3(key));
  if (!meta) meta = metaByName.get(normalizeName(key));
  if (meta) {
    const f = featureByCcn3.get(meta.ccn3);
    if (f) return f;
  }
  // Last resort: match the atlas feature name directly (covers territories
  // absent from the code table).
  return featureByName.get(normalizeName(key)) ?? null;
}

/** Human-readable name for a feature, for tooltips and CSV. */
export function countryName(f: CountryFeature): string {
  return f.properties.name;
}
