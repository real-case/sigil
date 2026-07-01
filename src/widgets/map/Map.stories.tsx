import type { Meta, StoryObj } from "@storybook/react-vite";
import { MapView } from "./MapView.js";
import { mapDatasets } from "../sandbox/datasets/map.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof MapView> = {
  title: "Widgets/Map",
  component: MapView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof MapView>;

export const Minimal: Story = { args: { payload: payloadById(mapDatasets, "map-minimal") } };
export const Small: Story = { args: { payload: payloadById(mapDatasets, "map-small") } };
export const Medium: Story = { args: { payload: payloadById(mapDatasets, "map-medium") } };
export const Large: Story = { args: { payload: payloadById(mapDatasets, "map-large") } };
export const Negatives: Story = { args: { payload: payloadById(mapDatasets, "map-negatives") } };
export const EdgeMixedIds: Story = { args: { payload: payloadById(mapDatasets, "map-edge-ids") } };
export const UsStatesPopulation: Story = { args: { payload: payloadById(mapDatasets, "map-us-population") } };
export const UsStatesFull: Story = { args: { payload: payloadById(mapDatasets, "map-us-index") } };
export const BubbleWorld: Story = { args: { payload: payloadById(mapDatasets, "map-bubble-world") } };
export const BubbleUs: Story = { args: { payload: payloadById(mapDatasets, "map-bubble-us") } };
