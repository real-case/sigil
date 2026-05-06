import { useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { installThemeStyles } from "./theme.js";
import "./styles.css";

export interface MountWidgetOptions<P> {
  name: string;
  isPayload: (value: unknown) => value is P;
  View: ComponentType<{ payload: P }>;
}

function extractPayload<P>(
  result: { structuredContent?: unknown; content?: unknown },
  isPayload: (value: unknown) => value is P,
): P | null {
  if (isPayload(result.structuredContent)) {
    return result.structuredContent;
  }
  if (Array.isArray(result.content) && result.content.length > 0) {
    const first = result.content[0] as { type?: string; text?: string };
    if (first?.type === "text" && typeof first.text === "string") {
      try {
        const parsed: unknown = JSON.parse(first.text);
        if (isPayload(parsed)) return parsed;
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

export function mountWidget<P>(opts: MountWidgetOptions<P>): void {
  if (typeof document === "undefined") return;
  installThemeStyles();

  const { name, isPayload, View } = opts;

  function App() {
    const [payload, setPayload] = useState<P | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    const { isConnected, error } = useApp({
      appInfo: { name, version: "0.1.0" },
      capabilities: {},
      onAppCreated: (app) => {
        app.ontoolresult = (params) => {
          if (params.isError) {
            setParseError("Server reported an error while preparing data.");
            return;
          }
          const next = extractPayload(params, isPayload);
          if (next) {
            setPayload(next);
            setParseError(null);
          } else {
            setParseError("Could not parse the tool result.");
          }
        };
      },
    });

    if (error) return <Status message={`Connection error: ${error.message}`} />;
    if (parseError) return <Status message={parseError} />;
    if (!isConnected) return <Status message="Connecting…" />;
    if (!payload) return <Status message="Waiting for data…" />;
    return <View payload={payload} />;
  }

  const root = document.getElementById("root");
  if (root) createRoot(root).render(<App />);
}
