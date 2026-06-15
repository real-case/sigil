import type { Meta, StoryObj } from "@storybook/react-vite";
import { TableView } from "./TableView.js";
import { tableDatasets } from "../sandbox/datasets/table.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof TableView> = {
  title: "Widgets/Table",
  component: TableView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof TableView>;

export const Minimal: Story = { args: { payload: payloadById(tableDatasets, "table-minimal") } };
export const Small: Story = { args: { payload: payloadById(tableDatasets, "table-small") } };
export const Medium: Story = { args: { payload: payloadById(tableDatasets, "table-medium") } };
export const Large: Story = { args: { payload: payloadById(tableDatasets, "table-large") } };
export const EdgeWideContent: Story = { args: { payload: payloadById(tableDatasets, "table-edge-wide-content") } };
