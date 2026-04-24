import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { TableView } from "./TableView.js";
import type {
  TableColumn,
  TablePayload,
  TableRow,
} from "../../shared/payloads.js";
import { installThemeStyles } from "../shared/theme.js";
import "../shared/styles.css";

installThemeStyles();

function isTableColumn(value: unknown): value is TableColumn {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["key"] === "string" &&
    typeof v["label"] === "string" &&
    (v["align"] === undefined ||
      v["align"] === "left" ||
      v["align"] === "right" ||
      v["align"] === "center")
  );
}

function isTableRow(value: unknown): value is TableRow {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Object.values(v).every(
    (cell) => typeof cell === "string" || typeof cell === "number",
  );
}

function isTablePayload(value: unknown): value is TablePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["title"] === "string" &&
    Array.isArray(v["columns"]) &&
    v["columns"].every(isTableColumn) &&
    Array.isArray(v["rows"]) &&
    v["rows"].every(isTableRow) &&
    typeof v["sortable"] === "boolean" &&
    typeof v["filterable"] === "boolean"
  );
}

function extractPayload(result: {
  structuredContent?: unknown;
  content?: unknown;
}): TablePayload | null {
  if (isTablePayload(result.structuredContent)) {
    return result.structuredContent;
  }
  if (Array.isArray(result.content) && result.content.length > 0) {
    const first = result.content[0] as { type?: string; text?: string };
    if (first?.type === "text" && typeof first.text === "string") {
      try {
        const parsed: unknown = JSON.parse(first.text);
        if (isTablePayload(parsed)) return parsed;
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
  const [payload, setPayload] = useState<TablePayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const { isConnected, error } = useApp({
    appInfo: { name: "mcpcharts-table", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (params) => {
        if (params.isError) {
          setParseError("Server reported an error while preparing table data.");
          return;
        }
        const next = extractPayload(params);
        if (next) {
          setPayload(next);
          setParseError(null);
        } else {
          setParseError("Received a tool result but could not parse it as a table payload.");
        }
      };
    },
  });

  if (error) return <Status message={`Connection error: ${error.message}`} />;
  if (parseError) return <Status message={parseError} />;
  if (!isConnected) return <Status message="Connecting…" />;
  if (!payload) return <Status message="Waiting for table data…" />;
  return <TableView payload={payload} />;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
