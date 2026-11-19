import type { Meta, StoryObj } from "@storybook/react-vite";
import { TimelineView } from "./TimelineView.js";
import { timelineDatasets } from "../sandbox/datasets/timeline.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof TimelineView> = {
  title: "Widgets/Timeline",
  component: TimelineView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof TimelineView>;

export const Minimal: Story = { args: { payload: payloadById(timelineDatasets, "timeline-minimal") } };
export const ProjectGantt: Story = { args: { payload: payloadById(timelineDatasets, "timeline-gantt") } };
export const ServiceState: Story = { args: { payload: payloadById(timelineDatasets, "timeline-state") } };
export const NumericSprints: Story = { args: { payload: payloadById(timelineDatasets, "timeline-numeric") } };
export const EdgeOpenEnded: Story = { args: { payload: payloadById(timelineDatasets, "timeline-edge") } };
