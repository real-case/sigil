import type { MapPayload } from "../../../shared/payloads.js";
import { US_STATE_FIPS } from "../../map/us-state-codes.js";
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
  {
    id: "map-us-population",
    label: "US states — population (partial)",
    category: "small",
    payload: {
      title: "Population by state (millions, 2024)",
      scope: "us-states",
      variant: "choropleth",
      valueLabel: "million people",
      data: [
        { id: "CA", value: 39.0 }, { id: "TX", value: 30.5 }, { id: "FL", value: 22.6 },
        { id: "NY", value: 19.6 }, { id: "PA", value: 13.0 }, { id: "IL", value: 12.5 },
        { id: "OH", value: 11.8 }, { id: "GA", value: 11.0 }, { id: "NC", value: 10.8 },
        { id: "MI", value: 10.0 }, { id: "NJ", value: 9.3 }, { id: "VA", value: 8.7 },
        { id: "WA", value: 7.8 }, { id: "AZ", value: 7.4 }, { id: "TN", value: 7.1 },
        { id: "MA", value: 7.0 },
      ],
    },
  },
  {
    id: "map-us-index",
    label: "US states — full (procedural)",
    category: "large",
    payload: {
      title: "State index (procedural)",
      scope: "us-states",
      variant: "choropleth",
      valueLabel: "score",
      data: Object.keys(US_STATE_FIPS).map((id, i) => ({
        id,
        value: Math.round(20 + det(i) * 80),
      })),
    },
  },
  {
    id: "map-bubble-world",
    label: "Bubble — world cities",
    category: "medium",
    payload: {
      title: "Largest metro areas",
      scope: "world",
      variant: "bubble",
      valueLabel: "metro population (M)",
      points: [
        { lat: 35.68, lon: 139.69, value: 37, label: "Tokyo" },
        { lat: 28.61, lon: 77.21, value: 33, label: "Delhi" },
        { lat: 31.23, lon: 121.47, value: 29, label: "Shanghai" },
        { lat: -23.55, lon: -46.63, value: 22, label: "São Paulo" },
        { lat: 19.43, lon: -99.13, value: 22, label: "Mexico City" },
        { lat: 30.04, lon: 31.24, value: 22, label: "Cairo" },
        { lat: 40.71, lon: -74.01, value: 19, label: "New York" },
        { lat: 6.52, lon: 3.38, value: 15, label: "Lagos" },
        { lat: 51.51, lon: -0.13, value: 14, label: "London" },
        { lat: 55.75, lon: 37.62, value: 12, label: "Moscow" },
        { lat: -26.2, lon: 28.05, value: 6, label: "Johannesburg" },
        { lat: -33.87, lon: 151.21, value: 5, label: "Sydney" },
      ],
    },
  },
  {
    id: "map-bubble-us",
    label: "Bubble — US cities (incl. AK/HI)",
    category: "medium",
    payload: {
      title: "US cities by population",
      scope: "us-states",
      variant: "bubble",
      valueLabel: "million people",
      points: [
        { lat: 40.71, lon: -74.01, value: 8.5, label: "New York" },
        { lat: 34.05, lon: -118.24, value: 3.9, label: "Los Angeles" },
        { lat: 41.88, lon: -87.63, value: 2.7, label: "Chicago" },
        { lat: 29.76, lon: -95.37, value: 2.3, label: "Houston" },
        { lat: 33.45, lon: -112.07, value: 1.6, label: "Phoenix" },
        { lat: 39.95, lon: -75.17, value: 1.6, label: "Philadelphia" },
        { lat: 32.72, lon: -117.16, value: 1.4, label: "San Diego" },
        { lat: 32.78, lon: -96.8, value: 1.3, label: "Dallas" },
        { lat: 47.61, lon: -122.33, value: 0.75, label: "Seattle" },
        { lat: 25.76, lon: -80.19, value: 0.44, label: "Miami" },
        { lat: 21.31, lon: -157.86, value: 0.35, label: "Honolulu" },
        { lat: 61.22, lon: -149.9, value: 0.29, label: "Anchorage" },
      ],
    },
  },
];
