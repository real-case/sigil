import type { Meta, StoryObj } from "@storybook/react-vite";
import { InfoCardView } from "./InfoCardView.js";
import { infoCardDatasets } from "../sandbox/datasets/info-card.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof InfoCardView> = {
  title: "Widgets/Info card",
  component: InfoCardView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof InfoCardView>;

export const Bullet: Story = { args: { payload: payloadById(infoCardDatasets, "info-card-bullet") } };
export const Gauge: Story = { args: { payload: payloadById(infoCardDatasets, "info-card-gauge") } };
export const Progress: Story = { args: { payload: payloadById(infoCardDatasets, "info-card-progress") } };
export const Ranking: Story = { args: { payload: payloadById(infoCardDatasets, "info-card-ranking") } };
export const RankingWithoutDeltas: Story = { args: { payload: payloadById(infoCardDatasets, "info-card-ranking-plain") } };
export const Comparison: Story = { args: { payload: payloadById(infoCardDatasets, "info-card-comparison") } };
export const Narrative: Story = { args: { payload: payloadById(infoCardDatasets, "info-card-narrative") } };
export const EdgeOffScale: Story = { args: { payload: payloadById(infoCardDatasets, "info-card-off-scale") } };
export const EdgeGaugeOffScale: Story = { args: { payload: payloadById(infoCardDatasets, "info-card-gauge-off-scale") } };
