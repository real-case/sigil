import type { MapPayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

// Deterministic pseudo-random in [0, 1) so procedural datasets stay stable
// across reloads (mirrors the heatmap/scatter generators).
function det(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Broad, all-in-the-atlas country set for a dense showcase map.
const LARGE_CODES = [
  "USA", "CAN", "MEX", "GTM", "CUB", "BRA", "ARG", "CHL", "PER", "COL",
  "VEN", "BOL", "PRY", "URY", "ECU", "GBR", "IRL", "FRA", "ESP", "PRT",
  "DEU", "NLD", "BEL", "CHE", "AUT", "ITA", "POL", "CZE", "SWE", "NOR",
  "FIN", "DNK", "GRC", "ROU", "UKR", "RUS", "TUR", "SAU", "IRN", "IRQ",
  "ISR", "EGY", "DZA", "MAR", "NGA", "ETH", "KEN", "ZAF", "TZA", "AGO",
  "IND", "PAK", "BGD", "CHN", "JPN", "KOR", "THA", "VNM", "IDN", "PHL",
  "MYS", "AUS", "NZL",
];

export const mapDatasets: Dataset<MapPayload>[] = [
  {
    id: "map-minimal",
    label: "Minimal — 3 countries",
    category: "minimal",
    payload: {
      title: "GDP per capita (2024)",
      scope: "world",
      variant: "choropleth",
      valueLabel: "USD",
      data: [
        { id: "USA", value: 81695 },
        { id: "DEU", value: 52746 },
        { id: "CHN", value: 12614 },
      ],
    },
  },
  {
    id: "map-small",
    label: "Small — 10 countries",
    category: "small",
    payload: {
      title: "Population by country (2024)",
      scope: "world",
      variant: "choropleth",
      valueLabel: "million people",
      data: [
        { id: "CHN", value: 1410 },
        { id: "IND", value: 1440 },
        { id: "USA", value: 340 },
        { id: "IDN", value: 279 },
        { id: "PAK", value: 245 },
        { id: "NGA", value: 224 },
        { id: "BRA", value: 217 },
        { id: "BGD", value: 173 },
        { id: "RUS", value: 144 },
        { id: "JPN", value: 124 },
      ],
    },
  },
  {
    id: "map-medium",
    label: "Medium — 24 countries",
    category: "medium",
    payload: {
      title: "Internet penetration (2024)",
      scope: "world",
      variant: "choropleth",
      valueLabel: "% of population",
      data: [
        { id: "USA", value: 92 }, { id: "CAN", value: 93 }, { id: "MEX", value: 76 },
        { id: "BRA", value: 81 }, { id: "ARG", value: 88 }, { id: "GBR", value: 96 },
        { id: "FRA", value: 93 }, { id: "DEU", value: 92 }, { id: "ESP", value: 94 },
        { id: "ITA", value: 85 }, { id: "POL", value: 88 }, { id: "RUS", value: 90 },
        { id: "TUR", value: 83 }, { id: "EGY", value: 72 }, { id: "NGA", value: 55 },
        { id: "ZAF", value: 72 }, { id: "KEN", value: 42 }, { id: "SAU", value: 99 },
        { id: "IND", value: 52 }, { id: "CHN", value: 77 }, { id: "JPN", value: 91 },
        { id: "KOR", value: 98 }, { id: "IDN", value: 66 }, { id: "AUS", value: 96 },
      ],
    },
  },
  {
    id: "map-large",
    label: "Large — 63 countries",
    category: "large",
    payload: {
      title: "Composite index (procedural)",
      scope: "world",
      variant: "choropleth",
      valueLabel: "score",
      data: LARGE_CODES.map((id, i) => ({ id, value: Math.round(20 + det(i) * 80) })),
    },
  },
  {
    id: "map-negatives",
    label: "Negatives — temperature anomaly",
    category: "negatives",
    payload: {
      title: "Avg. temperature anomaly vs 1990",
      scope: "world",
      variant: "choropleth",
      valueLabel: "°C",
      data: [
        { id: "RUS", value: 2.4 }, { id: "CAN", value: 1.9 }, { id: "USA", value: 1.4 },
        { id: "BRA", value: 0.8 }, { id: "AUS", value: 1.1 }, { id: "IND", value: 0.9 },
        { id: "CHN", value: 1.3 }, { id: "ARG", value: -0.3 }, { id: "CHL", value: -0.6 },
        { id: "NZL", value: -0.2 }, { id: "ZAF", value: 0.5 }, { id: "NOR", value: 2.1 },
      ],
    },
  },
  {
    id: "map-edge-ids",
    label: "Edge — mixed id formats + unmatched",
    category: "edgeLabels",
    payload: {
      title: "Mixed identifiers",
      scope: "world",
      variant: "choropleth",
      data: [
        { id: "United States", value: 5 },
        { id: "south korea", value: 8 },
        { id: "DE", value: 6, label: "Germany" },
        { id: "076", value: 7 },
        { id: "Atlantis", value: 99 },
        { id: "ZZZ", value: 50 },
      ],
    },
  },
];
