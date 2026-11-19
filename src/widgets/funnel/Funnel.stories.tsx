import type { Meta, StoryObj } from "@storybook/react-vite";
import { FunnelView } from "./FunnelView.js";
import { funnelDatasets } from "../sandbox/datasets/funnel.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof FunnelView> = {
  title: "Widgets/Funnel",
  component: FunnelView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof FunnelView>;

export const Minimal: Story = { args: { payload: payloadById(funnelDatasets, "funnel-minimal") } };
export const SignupFunnel: Story = { args: { payload: payloadById(funnelDatasets, "funnel-small") } };
export const VerticalPipeline: Story = { args: { payload: payloadById(funnelDatasets, "funnel-medium-vertical") } };
export const EdgeLongLabels: Story = { args: { payload: payloadById(funnelDatasets, "funnel-edge-labels") } };
export const DegradedGrowthAndZero: Story = { args: { payload: payloadById(funnelDatasets, "funnel-degraded-growth") } };
