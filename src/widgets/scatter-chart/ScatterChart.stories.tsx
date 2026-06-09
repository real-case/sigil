import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScatterChartView } from "./ScatterChartView.js";
import { scatterDatasets } from "../sandbox/datasets/scatter.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof ScatterChartView> = {
  title: "Widgets/Scatter chart",
  component: ScatterChartView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ScatterChartView>;

export const Minimal: Story = { args: { payload: payloadById(scatterDatasets, "scatter-minimal") } };
export const Small: Story = { args: { payload: payloadById(scatterDatasets, "scatter-small") } };
export const Medium: Story = { args: { payload: payloadById(scatterDatasets, "scatter-medium") } };
export const Large: Story = { args: { payload: payloadById(scatterDatasets, "scatter-large") } };
export const Negatives: Story = { args: { payload: payloadById(scatterDatasets, "scatter-negatives") } };
export const MultiSeries: Story = { args: { payload: payloadById(scatterDatasets, "scatter-multi-series") } };
