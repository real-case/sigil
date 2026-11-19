import type { Meta, StoryObj } from "@storybook/react-vite";
import { DistributionView } from "./DistributionView.js";
import { distributionDatasets } from "../sandbox/datasets/distribution.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof DistributionView> = {
  title: "Widgets/Distribution",
  component: DistributionView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof DistributionView>;

export const Minimal: Story = { args: { payload: payloadById(distributionDatasets, "distribution-minimal") } };
export const LatencyWithSlo: Story = { args: { payload: payloadById(distributionDatasets, "distribution-latency") } };
export const Bimodal: Story = { args: { payload: payloadById(distributionDatasets, "distribution-bimodal") } };
export const GroupsOnSharedScales: Story = { args: { payload: payloadById(distributionDatasets, "distribution-groups-histogram") } };
export const BoxPlotReleases: Story = { args: { payload: payloadById(distributionDatasets, "distribution-box-versions") } };
export const BoxFromSummaries: Story = { args: { payload: payloadById(distributionDatasets, "distribution-box-summary") } };
export const PreBinnedNegatives: Story = { args: { payload: payloadById(distributionDatasets, "distribution-prebinned") } };
