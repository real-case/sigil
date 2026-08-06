import type { SankeyPayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

function det(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280;
  return x - Math.floor(x);
}

export const sankeyDatasets: Dataset<SankeyPayload>[] = [
  {
    id: "sankey-minimal",
    label: "Minimal — 1 split",
    category: "minimal",
    payload: {
      title: "Landing-page traffic",
      valueLabel: "visits",
      links: [
        { source: "Visitors", target: "Signed up", value: 320 },
        { source: "Visitors", target: "Bounced", value: 1280 },
      ],
    },
  },
  {
    id: "sankey-small",
    label: "Small — 3-stage funnel",
    category: "small",
    payload: {
      title: "Checkout funnel",
      valueLabel: "sessions",
      links: [
        { source: "Product page", target: "Cart", value: 4200 },
        { source: "Product page", target: "Left product page", value: 9800 },
        { source: "Cart", target: "Checkout", value: 2600 },
        { source: "Cart", target: "Abandoned cart", value: 1600 },
        { source: "Checkout", target: "Purchase", value: 1900 },
        { source: "Checkout", target: "Payment failed", value: 700 },
      ],
    },
  },
  {
    id: "sankey-medium",
    label: "Medium — budget flows",
    category: "medium",
    payload: {
      title: "Where the budget goes",
      valueLabel: "k$",
      nodes: [
        { name: "Product sales" },
        { name: "Services" },
        { name: "Licensing" },
        { name: "Revenue" },
        { name: "R&D" },
        { name: "Sales & marketing" },
        { name: "Operations" },
        { name: "Profit" },
        { name: "Headcount" },
        { name: "Cloud" },
        { name: "Campaigns" },
        { name: "Facilities" },
      ],
      links: [
        { source: "Product sales", target: "Revenue", value: 8400 },
        { source: "Services", target: "Revenue", value: 3100 },
        { source: "Licensing", target: "Revenue", value: 1500 },
        { source: "Revenue", target: "R&D", value: 4300 },
        { source: "Revenue", target: "Sales & marketing", value: 3600 },
        { source: "Revenue", target: "Operations", value: 2900 },
        { source: "Revenue", target: "Profit", value: 2200 },
        { source: "R&D", target: "Headcount", value: 3200 },
        { source: "R&D", target: "Cloud", value: 1100 },
        { source: "Sales & marketing", target: "Headcount", value: 2100 },
        { source: "Sales & marketing", target: "Campaigns", value: 1500 },
        { source: "Operations", target: "Headcount", value: 1700 },
        { source: "Operations", target: "Facilities", value: 1200 },
      ],
    },
  },
  {
    id: "sankey-large",
    label: "Large — 2-stage fan-out",
    category: "large",
    payload: {
      title: "Traffic sources to outcomes",
      valueLabel: "sessions",
      links: [
        ...Array.from({ length: 8 }, (_, i) => ({
          source: `Channel ${i + 1}`,
          target: ["Landing A", "Landing B", "Landing C", "Landing D"][i % 4]!,
          value: Math.round(200 + det(17, i) * 1800),
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          source: `Channel ${i + 1}`,
          target: ["Landing B", "Landing C", "Landing D", "Landing A"][i % 4]!,
          value: Math.round(100 + det(29, i) * 900),
        })),
        ...["Landing A", "Landing B", "Landing C", "Landing D"].flatMap(
          (landing, i) => [
            { source: landing, target: "Converted", value: Math.round(150 + det(43, i) * 450) },
            { source: landing, target: "Dropped", value: Math.round(900 + det(57, i) * 1400) },
          ],
        ),
      ],
    },
  },
  {
    id: "sankey-edge-labels",
    label: "Edge — long node labels",
    category: "edgeLabels",
    payload: {
      title: "Support ticket routing",
      valueLabel: "tickets",
      links: [
        { source: "Inbound — email, chat and community forum", target: "Tier 1 triage (24×7 follow-the-sun)", value: 640 },
        { source: "Inbound — email, chat and community forum", target: "Self-service knowledge base deflection", value: 480 },
        { source: "Tier 1 triage (24×7 follow-the-sun)", target: "Tier 2 — product specialists, EMEA rotation", value: 260 },
        { source: "Tier 1 triage (24×7 follow-the-sun)", target: "Resolved at first contact", value: 380 },
        { source: "Tier 2 — product specialists, EMEA rotation", target: "Engineering escalation (Jira handoff)", value: 90 },
        { source: "Tier 2 — product specialists, EMEA rotation", target: "Resolved by specialists", value: 170 },
      ],
    },
  },
];
