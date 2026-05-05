import { createRoot } from "react-dom/client";
import { BarChartView } from "../bar-chart/BarChartView.js";
import { PieChartView } from "../pie-chart/PieChartView.js";
import { installThemeStyles, useTheme } from "../shared/theme.js";
import type { BarChartPayload, PieChartPayload } from "../../shared/payloads.js";
import "../shared/styles.css";

installThemeStyles();

const SLICE_LABELS = [
  "indigo",
  "teal",
  "amber",
  "pink",
  "violet",
  "emerald",
  "red",
  "sky",
  "lime",
  "fuchsia",
];

function Swatches() {
  const tokens = useTheme();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
      {tokens.seriesColors.map((hex, i) => (
        <div
          key={hex}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: 8,
            background: tokens.surfaceBackground,
            border: `1px solid ${tokens.axisLine}`,
            borderRadius: tokens.borderRadius,
          }}
        >
          <div style={{ width: "100%", height: 48, background: hex, borderRadius: 4 }} />
          <div style={{ fontFamily: tokens.fontFamily, fontSize: 11, color: tokens.textSecondary }}>
            {i}. {SLICE_LABELS[i] ?? "—"}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: tokens.textMuted }}>
            {hex}
          </div>
        </div>
      ))}
    </div>
  );
}

const piePayload: PieChartPayload = {
  title: "Pie — 10 equal slices (neighbour contrast test)",
  variant: "pie",
  data: SLICE_LABELS.map((label) => ({ label, value: 1 })),
};

const barPayload: BarChartPayload = {
  title: "Bars — 10 categories (per-bar palette colors)",
  orientation: "vertical",
  data: SLICE_LABELS.map((label, i) => ({
    label,
    value: 10 + i * 3,
  })),
};

function App() {
  const tokens = useTheme();
  return (
    <div
      style={{
        background: tokens.background,
        minHeight: "100vh",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <h1
        style={{
          fontFamily: tokens.fontFamily,
          color: tokens.textPrimary,
          fontSize: 18,
          margin: 0,
        }}
      >
        Sigil palette preview — 10 series colors
      </h1>
      <Swatches />
      <div style={{ height: 420 }}>
        <PieChartView payload={piePayload} />
      </div>
      <div style={{ height: 360 }}>
        <BarChartView payload={barPayload} />
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
