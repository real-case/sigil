import type { Meta, StoryObj } from "@storybook/react-vite";
import { TreemapView } from "./TreemapView.js";
import { treemapDatasets } from "../sandbox/datasets/treemap.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof TreemapView> = {
  title: "Widgets/Treemap",
  component: TreemapView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof TreemapView>;

export const Minimal: Story = { args: { payload: payloadById(treemapDatasets, "treemap-minimal") } };
export const SmallFlat: Story = { args: { payload: payloadById(treemapDatasets, "treemap-small-flat") } };
export const MediumFlat: Story = { args: { payload: payloadById(treemapDatasets, "treemap-medium-flat") } };
export const Nested: Story = { args: { payload: payloadById(treemapDatasets, "treemap-nested") } };
export const EdgeLongLabels: Story = { args: { payload: payloadById(treemapDatasets, "treemap-edge-labels") } };
