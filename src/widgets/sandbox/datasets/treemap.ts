import type { TreemapPayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function det(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280;
  return x - Math.floor(x);
}

export const treemapDatasets: Dataset<TreemapPayload>[] = [
  {
    id: "treemap-minimal",
    label: "Minimal — 2 leaves",
    category: "minimal",
    payload: {
      title: "Storage split",
      data: [
        { label: "Used", value: 78 },
        { label: "Free", value: 22 },
      ],
    },
  },
  {
    id: "treemap-small-flat",
    label: "Small — 6 flat leaves",
    category: "small",
    payload: {
      title: "Cost by service",
      data: [
        { label: "Compute", value: 18200 },
        { label: "Storage", value: 9100 },
        { label: "Database", value: 6900 },
        { label: "Egress", value: 7400 },
        { label: "Observability", value: 2800 },
        { label: "Other", value: 1850 },
      ],
    },
  },
  {
    id: "treemap-medium-flat",
    label: "Medium — 20 leaves",
    category: "medium",
    payload: {
      title: "File-type distribution",
      data: range(20).map((i) => ({
        label: `.ext${i + 1}`,
        value: Math.round(200 + det(91, i) * 1800),
      })),
    },
  },
  {
    id: "treemap-nested",
    label: "Nested — 3 levels",
    category: "nested",
    payload: {
      title: "Org headcount",
      data: [
        {
          label: "Engineering",
          value: 0,
          children: [
            {
              label: "Platform",
              value: 0,
              children: [
                { label: "Infra", value: 8 },
                { label: "Data", value: 6 },
                { label: "Security", value: 4 },
              ],
            },
            {
              label: "Product",
              value: 0,
              children: [
                { label: "Web", value: 9 },
                { label: "Mobile", value: 7 },
                { label: "API", value: 5 },
              ],
            },
          ],
        },
        {
          label: "Go-to-market",
          value: 0,
          children: [
            {
              label: "Sales",
              value: 0,
              children: [
                { label: "Enterprise", value: 6 },
                { label: "Mid-market", value: 4 },
              ],
            },
            {
              label: "Marketing",
              value: 0,
              children: [
                { label: "Content", value: 3 },
                { label: "Demand gen", value: 4 },
              ],
            },
          ],
        },
        {
          label: "Operations",
          value: 0,
          children: [
            { label: "Finance", value: 4 },
            { label: "People", value: 3 },
            { label: "Support", value: 6 },
          ],
        },
      ],
    },
  },
  {
    id: "treemap-edge-labels",
    label: "Edge — long node labels",
    category: "edgeLabels",
    payload: {
      title: "Cloud spend by line item",
      data: [
        { label: "Compute — On-Demand EC2 c5.4xlarge — eu-west-1", value: 18200 },
        { label: "Compute — Spot EC2 m6i.large — us-east-1", value: 4100 },
        { label: "Storage — S3 Standard — IA + Glacier transitions", value: 6300 },
        { label: "Egress — Inter-region replication, EU ↔ NA", value: 5400 },
        { label: "Database — RDS PostgreSQL Multi-AZ", value: 6900 },
        { label: "CDN — CloudFront, global edge cache", value: 1850 },
      ],
    },
  },
];
