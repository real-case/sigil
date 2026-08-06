import type { Meta, StoryObj } from "@storybook/react-vite";
import { SankeyView } from "./SankeyView.js";
import { sankeyDatasets } from "../sandbox/datasets/sankey.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof SankeyView> = {
  title: "Widgets/Sankey",
  component: SankeyView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof SankeyView>;

export const Minimal: Story = { args: { payload: payloadById(sankeyDatasets, "sankey-minimal") } };
export const SmallFunnel: Story = { args: { payload: payloadById(sankeyDatasets, "sankey-small") } };
export const MediumBudget: Story = { args: { payload: payloadById(sankeyDatasets, "sankey-medium") } };
export const LargeFanOut: Story = { args: { payload: payloadById(sankeyDatasets, "sankey-large") } };
export const EdgeLongLabels: Story = { args: { payload: payloadById(sankeyDatasets, "sankey-edge-labels") } };
