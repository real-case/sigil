// Geometry + region-id resolution for the map widget, one provider per scope.
//
// Decodes the bundled atlases into GeoJSON features once and resolves a datum's
// region id to the matching feature. Kept free of React so MapView stays purely
// presentational; each scope also names its projection factory and fit aspect,
// which the view uses to size and draw the map.

import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import { geoNaturalEarth1, geoAlbersUsa, type GeoProjection } from "d3-geo";
import worldAtlasRaw from "world-atlas/countries-110m.json";
import usAtlasRaw from "us-atlas/states-10m.json";
import type { MapScope } from "../../shared/payloads.js";
import { COUNTRY_CODES, type CountryCode } from "./country-codes.js";
import { US_STATE_FIPS } from "./us-state-codes.js";

export type RegionFeature = Feature<Geometry, { name: string }>;

export interface ScopeGeo {
  /** Features drawn for this scope. */
  features: readonly RegionFeature[];
  /** Fresh projection factory (fitSize mutates it, so the view calls per size). */
  projection: () => GeoProjection;
  /** Resolve a datum id to a feature, or null if nothing matches. */
  resolve: (id: string) => RegionFeature | null;
  /** Noun for the region kind, used in CSV headers. */
  regionLabel: string;
  /** height / width for the fit box, ≈ the projection's natural aspect. */
  aspect: number;
}

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

function pad(id: string | number | undefined, width: number): string {
  return String(id ?? "").padStart(width, "0");
}

function decode(raw: unknown, objectName: string): RegionFeature[] {
  const topo = raw as { objects: Record<string, unknown> };
  const fc = feature(topo as never, topo.objects[objectName] as never) as unknown as {
    features: RegionFeature[];
  };
  return fc.features;
}

export function regionName(f: RegionFeature): string {
  return f.properties.name;
}

// ---- World countries --------------------------------------------------------

// Antarctica (ccn3 010) dominates the vertical extent of a world projection and
// is rarely a data target — drop it so the fit stays tight.
const WORLD_FEATURES: readonly RegionFeature[] = decode(
  worldAtlasRaw,
  "countries",
).filter((f) => pad(f.id, 3) !== "010");

const countryByCode = new Map<string, CountryCode>();
const countryByName = new Map<string, CountryCode>();
for (const c of COUNTRY_CODES) {
  countryByCode.set(c.a3.toUpperCase(), c);
  countryByCode.set(c.a2.toUpperCase(), c);
  countryByCode.set(c.ccn3, c);
  countryByName.set(normalizeName(c.name), c);
}

const countryFeatureByCcn3 = new Map<string, RegionFeature>();
const countryFeatureByName = new Map<string, RegionFeature>();
for (const f of WORLD_FEATURES) {
  countryFeatureByCcn3.set(pad(f.id, 3), f);
  countryFeatureByName.set(normalizeName(f.properties.name), f);
}

function resolveCountry(rawId: string): RegionFeature | null {
  const key = rawId.trim();
  if (!key) return null;
  let meta = countryByCode.get(key.toUpperCase());
  if (!meta && /^\d+$/.test(key)) meta = countryByCode.get(pad(key, 3));
  if (!meta) meta = countryByName.get(normalizeName(key));
  if (meta) {
    const f = countryFeatureByCcn3.get(meta.ccn3);
    if (f) return f;
  }
  return countryFeatureByName.get(normalizeName(key)) ?? null;
}

const worldGeo: ScopeGeo = {
  features: WORLD_FEATURES,
  projection: geoNaturalEarth1,
  resolve: resolveCountry,
  regionLabel: "Country",
  aspect: 0.52,
};

// ---- US states --------------------------------------------------------------

const US_FIPS_SET = new Set(Object.values(US_STATE_FIPS));

// Keep only the 50 states + DC that geoAlbersUsa positions (drops territories).
const US_FEATURES: readonly RegionFeature[] = decode(usAtlasRaw, "states").filter(
  (f) => US_FIPS_SET.has(pad(f.id, 2)),
);

const stateFeatureByFips = new Map<string, RegionFeature>();
const stateFeatureByName = new Map<string, RegionFeature>();
for (const f of US_FEATURES) {
  stateFeatureByFips.set(pad(f.id, 2), f);
  stateFeatureByName.set(normalizeName(f.properties.name), f);
}

function resolveState(rawId: string): RegionFeature | null {
  const key = rawId.trim();
  if (!key) return null;
  // Accept ISO 3166-2 form ("US-CA") as well as bare USPS ("CA").
  const upper = key.toUpperCase().replace(/^US-/, "");
  let fips = US_STATE_FIPS[upper];
  if (!fips && /^\d+$/.test(key)) {
    const p = pad(key, 2);
    if (US_FIPS_SET.has(p)) fips = p;
  }
  if (fips) {
    const f = stateFeatureByFips.get(fips);
    if (f) return f;
  }
  return stateFeatureByName.get(normalizeName(key)) ?? null;
}

const usGeo: ScopeGeo = {
  features: US_FEATURES,
  projection: geoAlbersUsa,
  resolve: resolveState,
  regionLabel: "State",
  aspect: 0.6,
};

export function scopeGeo(scope: MapScope): ScopeGeo {
  return scope === "us-states" ? usGeo : worldGeo;
}
