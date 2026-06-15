import type { Meta, StoryObj } from "@storybook/react-vite";
import { PieChartView } from "./PieChartView.js";
import { pieDatasets } from "../sandbox/datasets/pie.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof PieChartView> = {
  title: "Widgets/Pie chart",
  component: PieChartView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof PieChartView>;

export const MinimalTwo: Story = { args: { payload: payloadById(pieDatasets, "pie-minimal-two") } };
export const SmallDonut: Story = { args: { payload: payloadById(pieDatasets, "pie-small-donut") } };
export const Medium: Story = { args: { payload: payloadById(pieDatasets, "pie-medium") } };
export const EdgeLongLabels: Story = { args: { payload: payloadById(pieDatasets, "pie-edge-labels") } };
export const LargeImbalanced: Story = { args: { payload: payloadById(pieDatasets, "pie-large-imbalanced") } };
