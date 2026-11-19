import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { timelineSchema } from "../shared/schemas.js";
import type { TimelinePayload } from "../shared/payloads.js";

export const TIMELINE_UI_URI = "ui://sigil/timeline";

const description = [
  "Render intervals in time as horizontal bars in lanes: a Gantt-style schedule (tasks, phases, sprints, releases, on-call shifts) or a state timeline (a service up / degraded / down, a deal's stage, a machine's run state over a day).",
  "Each item is a { row, start, end } interval; give items a `state` and declare `states` with tones for a state timeline, add `milestones` for deadlines and releases, and `now` for a today line.",
  "Times are ISO 8601 dates or date-times (shown in UTC), or plain numbers with a `unit`.",
  "Use whenever the data has a start AND an end, or answers 'when / for how long / what overlapped'.",
  "For a measure over time use render_line_chart; for one value per day use render_heatmap in calendar mode.",
].join(" ");

export function registerTimelineTool(server: McpServer) {
  registerAppTool(
    server,
    "render_timeline",
    {
      title: "Timeline",
      description,
      inputSchema: timelineSchema.shape,
      _meta: { ui: { resourceUri: TIMELINE_UI_URI } },
    },
    async (args) => {
      // `.shape` cannot carry the cross-field rules (one kind of time, end not
      // before start), so the handler runs the whole schema.
      const checked = timelineSchema.safeParse(args);
      if (!checked.success) throw new Error(z.prettifyError(checked.error));
      const payload: TimelinePayload = {
        title: args.title,
        followUps: args.followUps,
        items: args.items,
        rows: args.rows,
        states: args.states,
        milestones: args.milestones,
        now: args.now,
        unit: args.unit,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
