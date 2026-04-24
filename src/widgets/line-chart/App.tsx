import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { LineChartView } from "./LineChartView.js";
import type {
  LineChartPayload,
  LineSeries,
  LineDatum,
} from "../../shared/payloads.js";
import { installThemeStyles } from "../shared/theme.js";
import "../shared/styles.css";

installThemeStyles();

function isLineDatum(value: unknown): value is LineDatum {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (typeof v["x"] === "string" || typeof v["x"] === "number") &&
    typeof v["y"] === "number"
  );
}

function isLineSeries(value: unknown): value is LineSeries {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["name"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isLineDatum)
  );
}

function isLineChartPayload(value: unknown): value is LineChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["series"]) &&
    v["series"].every(isLineSeries)
  );
}

function extractPayload(result: {
  structuredContent?: unknown;
  content?: unknown;
}): LineChartPayload | null {
  if (isLineChartPayload(result.structuredContent)) {
    return result.structuredContent;
  }
  if (Array.isArray(result.content) && result.content.length > 0) {
    const first = result.content[0] as { type?: string; text?: string };
    if (first?.type === "text" && typeof first.text === "string") {
      try {
        const parsed: unknown = JSON.parse(first.text);
        if (isLineChartPayload(parsed)) return parsed;
      } catch {
        // fallthrough
      }
    }
  }
  return null;
}

function Status({ message }: { message: string }) {
  return (
    <div className="mcpcharts-root mcpcharts-empty">
      <p>{message}</p>
    </div>
  );
}

function App() {
  const [payload, setPayload] = useState<LineChartPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const { isConnected, error } = useApp({
    appInfo: { name: "mcpcharts-line-chart", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (params) => {
        if (params.isError) {
          setParseError("Server reported an error while preparing chart data.");
          return;
        }
        const next = extractPayload(params);
        if (next) {
          setPayload(next);
          setParseError(null);
        } else {
          setParseError("Received a tool result but could not parse it as a line chart payload.");
        }
      };
    },
  });

  if (error) return <Status message={`Connection error: ${error.message}`} />;
  if (parseError) return <Status message={parseError} />;
  if (!isConnected) return <Status message="Connecting…" />;
  if (!payload) return <Status message="Waiting for chart data…" />;
  return <LineChartView payload={payload} />;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
