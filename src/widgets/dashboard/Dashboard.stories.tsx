import type { Meta, StoryObj } from "@storybook/react-vite";
import { DashboardView } from "./DashboardView.js";
import { dashboardDatasets } from "../sandbox/datasets/dashboard.js";
import { payloadById } from "../shared/storybook/from-datasets.js";

const meta: Meta<typeof DashboardView> = {
  title: "Widgets/Dashboard",
  component: DashboardView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof DashboardView>;

// One story per dataset in the shared catalog (src/widgets/sandbox/datasets/dashboard.ts).
// Payloads are read by id — never redefined inline.
export const Minimal: Story = { args: { payload: payloadById(dashboardDatasets, "dashboard-minimal") } };
export const Overview: Story = { args: { payload: payloadById(dashboardDatasets, "dashboard-overview") } };
export const Flow: Story = { args: { payload: payloadById(dashboardDatasets, "dashboard-flow") } };
export const Geo: Story = { args: { payload: payloadById(dashboardDatasets, "dashboard-geo") } };
