import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatPanelView } from "./StatPanelView.js";
import { statPanelDatasets } from "../sandbox/datasets/stat-panel.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof StatPanelView> = {
  title: "Widgets/Stat panel",
  component: StatPanelView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof StatPanelView>;

// One story per dataset in the shared catalog (src/widgets/sandbox/datasets/stat-panel.ts).
// Payloads are read by id — never redefined inline.
export const Minimal: Story = { args: { payload: payloadById(statPanelDatasets, "stat-minimal") } };
export const Small: Story = { args: { payload: payloadById(statPanelDatasets, "stat-small") } };
export const Medium: Story = { args: { payload: payloadById(statPanelDatasets, "stat-medium") } };
export const Rich: Story = { args: { payload: payloadById(statPanelDatasets, "stat-rich") } };
export const EdgeLongLabels: Story = { args: { payload: payloadById(statPanelDatasets, "stat-edge-labels") } };
