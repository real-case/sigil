import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { PieChartView } from "./PieChartView.js";
import type { PieChartPayload, PieDatum } from "../../shared/payloads.js";
import { installThemeStyles } from "../shared/theme.js";
import "../shared/styles.css";

installThemeStyles();

function isPieDatum(value: unknown): value is PieDatum {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["label"] === "string" &&
    typeof v["value"] === "number" &&
    (v["color"] === undefined || typeof v["color"] === "string")
  );
}

function isPieChartPayload(value: unknown): value is PieChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["data"]) &&
    v["data"].every(isPieDatum) &&
    (v["variant"] === "pie" || v["variant"] === "donut")
  );
}

function extractPayload(result: {
  structuredContent?: unknown;
  content?: unknown;
}): PieChartPayload | null {
  if (isPieChartPayload(result.structuredContent)) {
    return result.structuredContent;
  }
  if (Array.isArray(result.content) && result.content.length > 0) {
    const first = result.content[0] as { type?: string; text?: string };
    if (first?.type === "text" && typeof first.text === "string") {
      try {
        const parsed: unknown = JSON.parse(first.text);
        if (isPieChartPayload(parsed)) return parsed;
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
  const [payload, setPayload] = useState<PieChartPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const { isConnected, error } = useApp({
    appInfo: { name: "sigil-pie-chart", version: "0.1.0" },
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
          setParseError("Received a tool result but could not parse it as a pie chart payload.");
        }
      };
    },
  });

  if (error) return <Status message={`Connection error: ${error.message}`} />;
  if (parseError) return <Status message={parseError} />;
  if (!isConnected) return <Status message="Connecting…" />;
  if (!payload) return <Status message="Waiting for chart data…" />;
  return <PieChartView payload={payload} />;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
