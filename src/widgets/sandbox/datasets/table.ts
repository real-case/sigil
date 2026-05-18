import type { TablePayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function det(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280;
  return x - Math.floor(x);
}

export const tableDatasets: Dataset<TablePayload>[] = [
  {
    id: "table-minimal",
    label: "Minimal — 1 row",
    category: "minimal",
    payload: {
      title: "Latest deploy",
      sortable: false,
      filterable: false,
      columns: [
        { key: "sha", label: "Commit" },
        { key: "author", label: "Author" },
        { key: "when", label: "When", align: "right" },
      ],
      rows: [{ sha: "8af3c91", author: "y.anichkin", when: "2 min ago" }],
    },
  },
  {
    id: "table-small",
    label: "Small — 6 customers",
    category: "small",
    payload: {
      title: "Top customers",
      sortable: true,
      filterable: true,
      columns: [
        { key: "name", label: "Name" },
        { key: "plan", label: "Plan" },
        { key: "seats", label: "Seats", align: "right" },
        { key: "mrr", label: "MRR (USD)", align: "right" },
      ],
      rows: [
        { name: "Acme Corp", plan: "Enterprise", seats: 1240, mrr: 48_200 },
        { name: "Globex", plan: "Enterprise", seats: 980, mrr: 36_900 },
        { name: "Initech", plan: "Business", seats: 410, mrr: 14_300 },
        { name: "Hooli", plan: "Enterprise", seats: 720, mrr: 28_800 },
        { name: "Soylent", plan: "Business", seats: 230, mrr: 8_700 },
        { name: "Umbrella", plan: "Startup", seats: 42, mrr: 1_980 },
      ],
    },
  },
  {
    id: "table-medium",
    label: "Medium — 25 rows",
    category: "medium",
    payload: {
      title: "Recent deployments",
      sortable: true,
      filterable: true,
      columns: [
        { key: "sha", label: "Commit" },
        { key: "service", label: "Service" },
        { key: "env", label: "Env" },
        { key: "duration", label: "Duration (s)", align: "right" },
        { key: "status", label: "Status" },
      ],
      rows: range(25).map((i) => ({
        sha: `${(det(7, i) * 0xffffff).toString(16).slice(0, 7)}`,
        service: ["api", "web", "worker", "cron"][i % 4]!,
        env: ["prod", "staging"][i % 2]!,
        duration: Math.round(40 + det(8, i) * 340),
        status: det(9, i) > 0.15 ? "success" : "failed",
      })),
    },
  },
  {
    id: "table-large",
    label: "Large — 200 rows",
    category: "large",
    payload: {
      title: "Event log",
      sortable: true,
      filterable: true,
      columns: [
        { key: "ts", label: "Timestamp" },
        { key: "level", label: "Level" },
        { key: "actor", label: "Actor" },
        { key: "event", label: "Event" },
      ],
      rows: range(200).map((i) => ({
        ts: `2026-05-${String(1 + (i % 28)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00Z`,
        level: ["info", "info", "info", "warn", "error"][i % 5]!,
        actor: `user_${(i * 13) % 47}`,
        event: ["login", "logout", "create", "update", "delete", "export", "import"][i % 7]!,
      })),
    },
  },
  {
    id: "table-edge-wide-content",
    label: "Edge — wide text cells",
    category: "edgeLabels",
    payload: {
      title: "Incident summary",
      sortable: false,
      filterable: false,
      columns: [
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "description", label: "Description" },
        { key: "owner", label: "Owner" },
      ],
      rows: [
        {
          id: "INC-001",
          title: "Database failover during routine maintenance window",
          description:
            "The primary database failed over to the secondary replica due to a kernel panic on the primary host. Application impact was limited to ~45 seconds of elevated error rates.",
          owner: "platform",
        },
        {
          id: "INC-002",
          title: "CDN cache poisoning on /assets path",
          description:
            "A misconfigured deploy invalidated cached assets globally and re-populated them with the wrong content-type headers, breaking script execution on production.",
          owner: "web",
        },
        {
          id: "INC-003",
          title: "Worker queue backlog on signup pipeline",
          description:
            "The signup worker pool was undersized for the marketing launch, leading to queue lengths exceeding 30k messages and signup delays of up to 8 minutes.",
          owner: "growth",
        },
      ],
    },
  },
];
