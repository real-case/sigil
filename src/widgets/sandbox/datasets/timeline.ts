import type { TimelinePayload } from "../../../shared/payloads.js";
import { type Dataset } from "./types.js";

export const timelineDatasets: Dataset<TimelinePayload>[] = [
  {
    id: "timeline-minimal",
    label: "Minimal — one interval",
    category: "minimal",
    payload: {
      title: "Maintenance window",
      items: [{ row: "Database", start: "2026-11-21T01:00:00Z", end: "2026-11-21T03:30:00Z", label: "Upgrade" }],
    },
  },
  {
    id: "timeline-gantt",
    label: "Small — project plan (Gantt)",
    category: "small",
    payload: {
      title: "Checkout redesign, Q4 plan",
      rows: ["Research", "Design", "Build", "QA", "Rollout"],
      items: [
        { row: "Research", start: "2026-10-01", end: "2026-10-16", label: "Interviews" },
        { row: "Design", start: "2026-10-12", end: "2026-11-02", label: "Flows + UI" },
        { row: "Build", start: "2026-10-26", end: "2026-12-04", label: "Frontend + API" },
        { row: "QA", start: "2026-11-23", end: "2026-12-11", label: "Regression" },
        { row: "Rollout", start: "2026-12-07", end: "2026-12-21", label: "10% → 100%" },
      ],
      milestones: [
        { at: "2026-11-02", label: "Design sign-off", row: "Design" },
        { at: "2026-12-14", label: "Code freeze" },
      ],
      now: "2026-11-19",
      followUps: ["What is on the critical path?", "Which tasks overlap?"],
    },
  },
  {
    id: "timeline-state",
    label: "Medium — service state timeline",
    category: "medium",
    payload: {
      title: "Service health, Nov 18 (UTC)",
      states: [
        { name: "up", tone: "success" },
        { name: "degraded", tone: "warning" },
        { name: "down", tone: "danger" },
        { name: "maintenance", tone: "neutral" },
      ],
      items: [
        { row: "API gateway", start: "2026-11-18T00:00:00Z", state: "up" },
        { row: "API gateway", start: "2026-11-18T09:40:00Z", state: "degraded" },
        { row: "API gateway", start: "2026-11-18T10:25:00Z", state: "up" },
        { row: "Payments", start: "2026-11-18T00:00:00Z", state: "up" },
        { row: "Payments", start: "2026-11-18T09:52:00Z", state: "down" },
        { row: "Payments", start: "2026-11-18T10:18:00Z", state: "degraded" },
        { row: "Payments", start: "2026-11-18T11:05:00Z", state: "up" },
        { row: "Search", start: "2026-11-18T00:00:00Z", state: "maintenance" },
        { row: "Search", start: "2026-11-18T02:00:00Z", state: "up" },
        { row: "Notifications", start: "2026-11-18T00:00:00Z", state: "up" },
        { row: "Notifications", start: "2026-11-18T17:30:00Z", state: "degraded" },
        { row: "Notifications", start: "2026-11-18T18:10:00Z", state: "up" },
      ],
      milestones: [{ at: "2026-11-18T09:35:00Z", label: "Deploy 4.12" }],
      now: "2026-11-18T23:59:00Z",
    },
  },
  {
    id: "timeline-numeric",
    label: "Multi-series — numeric sprints, untoned states",
    category: "multiSeries",
    payload: {
      title: "Team allocation by sprint",
      unit: "sprint",
      items: [
        { row: "Alex", start: 1, end: 3, state: "Payments" },
        { row: "Alex", start: 3, end: 6, state: "Search" },
        { row: "Sam", start: 1, end: 4, state: "Search" },
        { row: "Sam", start: 4, end: 6, state: "Onboarding" },
        { row: "Robin", start: 1, end: 2, state: "Onboarding" },
        { row: "Robin", start: 2, end: 6, state: "Payments" },
        { row: "Kai", start: 2, end: 5, state: "Onboarding" },
      ],
      now: 4,
    },
  },
  {
    id: "timeline-edge",
    label: "Edge — long lane names, open-ended bars",
    category: "edgeLabels",
    payload: {
      title: "Incident response, INC-2291",
      items: [
        { row: "Detection and paging of the on-call engineer", start: "2026-11-12T14:02:00Z", end: "2026-11-12T14:09:00Z" },
        { row: "Investigation across payments and ledger services", start: "2026-11-12T14:09:00Z", end: "2026-11-12T15:20:00Z" },
        { row: "Mitigation", start: "2026-11-12T15:05:00Z", end: "2026-11-12T15:41:00Z", label: "Rollback" },
        { row: "Customer communication", start: "2026-11-12T14:30:00Z", label: "Status page" },
      ],
      now: "2026-11-12T16:30:00Z",
    },
  },
];
