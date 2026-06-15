import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeatmapView } from "./HeatmapView.js";
import { heatmapDatasets } from "../sandbox/datasets/heatmap.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof HeatmapView> = {
  title: "Widgets/Heatmap",
  component: HeatmapView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof HeatmapView>;

export const Minimal: Story = { args: { payload: payloadById(heatmapDatasets, "heatmap-minimal") } };
export const Small: Story = { args: { payload: payloadById(heatmapDatasets, "heatmap-small") } };
export const Medium: Story = { args: { payload: payloadById(heatmapDatasets, "heatmap-medium") } };
export const Large: Story = { args: { payload: payloadById(heatmapDatasets, "heatmap-large") } };
export const EdgeLongLabels: Story = { args: { payload: payloadById(heatmapDatasets, "heatmap-edge-labels") } };
