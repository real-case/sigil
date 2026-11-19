import type { Meta, StoryObj } from "@storybook/react-vite";
import { LineChartView } from "./LineChartView.js";
import { lineDatasets } from "../sandbox/datasets/line.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof LineChartView> = {
  title: "Widgets/Line chart",
  component: LineChartView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof LineChartView>;

export const MinimalSingle: Story = { args: { payload: payloadById(lineDatasets, "line-minimal-single") } };
export const SmallCategorical: Story = { args: { payload: payloadById(lineDatasets, "line-small-categorical") } };
export const MediumNumeric: Story = { args: { payload: payloadById(lineDatasets, "line-medium-numeric") } };
export const LargeNumeric: Story = { args: { payload: payloadById(lineDatasets, "line-large-numeric") } };
export const EdgeLongLabels: Story = { args: { payload: payloadById(lineDatasets, "line-edge-labels") } };
export const Negatives: Story = { args: { payload: payloadById(lineDatasets, "line-negatives") } };
export const MultiSeries: Story = { args: { payload: payloadById(lineDatasets, "line-multi-series") } };
export const ComparePrevious: Story = { args: { payload: payloadById(lineDatasets, "line-compare-previous") } };
export const ReferenceAnnotations: Story = { args: { payload: payloadById(lineDatasets, "line-reference-annotations") } };
export const SmallMultiples: Story = { args: { payload: payloadById(lineDatasets, "line-facets") } };
export const DashPatterns: Story = { args: { payload: payloadById(lineDatasets, "line-patterns") } };
