import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { BarChartView } from "./BarChartView.js";
import type { BarChartPayload, BarDatum } from "../../shared/payloads.js";
import { installThemeStyles } from "../shared/theme.js";
import "../shared/styles.css";

installThemeStyles();

function isBarDatum(value: unknown): value is BarDatum {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["label"] === "string" &&
    typeof v["value"] === "number" &&
    (v["color"] === undefined || typeof v["color"] === "string")
  );
}

function isBarChartPayload(value: unknown): value is BarChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isBarDatum) &&
    (v["orientation"] === "vertical" || v["orientation"] === "horizontal")
  );
}

function extractPayload(result: { structuredContent?: unknown; content?: unknown }): BarChartPayload | null {
  if (isBarChartPayload(result.structuredContent)) {
    return result.structuredContent;
  }
  if (Array.isArray(result.content) && result.content.length > 0) {
    const first = result.content[0] as { type?: string; text?: string };
    if (first?.type === "text" && typeof first.text === "string") {
      try {
        const parsed: unknown = JSON.parse(first.text);
        if (isBarChartPayload(parsed)) return parsed;
      } catch {
        // fallthrough
      }
    }
  }
  return null;
}

function Status({ message }: { message: string }) {
  return (
    <div className="sigil-root sigil-empty">
      <p>{message}</p>
    </div>
  );
}

function App() {
  const [payload, setPayload] = useState<BarChartPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const { isConnected, error } = useApp({
    appInfo: { name: "sigil-bar-chart", version: "0.1.0" },
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
          setParseError("Received a tool result but could not parse it as a bar chart payload.");
        }
      };
    },
  });

  if (error) return <Status message={`Connection error: ${error.message}`} />;
  if (parseError) return <Status message={parseError} />;
  if (!isConnected) return <Status message="Connecting…" />;
  if (!payload) return <Status message="Waiting for chart data…" />;
  return <BarChartView payload={payload} />;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
