import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChartView } from "./BarChartView.js";
import { barDatasets } from "../sandbox/datasets/bar.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof BarChartView> = {
  title: "Widgets/Bar chart",
  component: BarChartView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof BarChartView>;

// One story per dataset in the shared catalog (src/widgets/sandbox/datasets/bar.ts).
// Payloads are read by id — never redefined inline.
export const MinimalSingle: Story = { args: { payload: payloadById(barDatasets, "bar-minimal-single") } };
export const SmallVertical: Story = { args: { payload: payloadById(barDatasets, "bar-small-vertical") } };
export const SmallHorizontal: Story = { args: { payload: payloadById(barDatasets, "bar-small-horizontal") } };
export const MediumVertical: Story = { args: { payload: payloadById(barDatasets, "bar-medium-vertical") } };
export const LargeVertical: Story = { args: { payload: payloadById(barDatasets, "bar-large-vertical") } };
export const EdgeLongLabels: Story = { args: { payload: payloadById(barDatasets, "bar-edge-labels") } };
export const NegativesMixed: Story = { args: { payload: payloadById(barDatasets, "bar-negatives-mixed") } };
