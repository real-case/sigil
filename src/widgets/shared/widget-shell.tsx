import { useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { installThemeStyles } from "./theme.js";
import { LoadingSkeleton, type LoadingVariant } from "./LoadingSkeleton.js";
import { EmptyState } from "./EmptyState.js";
import "./styles.css";

export interface MountWidgetOptions<P> {
  name: string;
  isPayload: (value: unknown) => value is P;
  View: ComponentType<{ payload: P }>;
  /** Hint for loading skeleton shape; defaults to "generic". */
  loadingVariant?: LoadingVariant;
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

function ShellFrame({ children }: { children: React.ReactNode }) {
  return <div className="sigil-root">{children}</div>;
}

export function mountWidget<P>(opts: MountWidgetOptions<P>): void {
  if (typeof document === "undefined") return;
  installThemeStyles();

  const { name, isPayload, View, loadingVariant = "generic" } = opts;

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

    if (error) {
      return (
        <ShellFrame>
          <EmptyState
            variant="error"
            title="Connection error"
            description={error.message}
          />
        </ShellFrame>
      );
    }
    if (parseError) {
      return (
        <ShellFrame>
          <EmptyState
            variant="error"
            title="Could not load data"
            description={parseError}
          />
        </ShellFrame>
      );
    }
    if (!isConnected || !payload) {
      return (
        <ShellFrame>
          <LoadingSkeleton variant={loadingVariant} />
        </ShellFrame>
      );
    }
    return <View payload={payload} />;
  }

  const root = document.getElementById("root");
  if (root) createRoot(root).render(<App />);
}
