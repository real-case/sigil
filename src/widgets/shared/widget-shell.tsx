import { useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { installThemeStyles } from "./theme.js";
import { LoadingSkeleton, type LoadingVariant } from "./LoadingSkeleton.js";
import { EmptyState } from "./EmptyState.js";
import "./styles.css";

// Injected by Vite `define` from package.json at build time; absent when the
// module is evaluated outside a Vite build (e.g. vitest), hence the guard.
declare const __SIGIL_VERSION__: string | undefined;
const WIDGET_VERSION =
  typeof __SIGIL_VERSION__ === "string" ? __SIGIL_VERSION__ : "0.0.0-dev";

export interface MountWidgetOptions<P> {
  name: string;
  isPayload: (value: unknown) => value is P;
  View: ComponentType<{ payload: P }>;
  /** Hint for loading skeleton shape; defaults to "generic". */
  loadingVariant?: LoadingVariant;
}

/**
 * A guard is a widget's own code, handed a value nothing has vetted:
 * `structuredContent` is whatever the host passed along, and the text branch
 * below offers up free text that JSON.parse merely happened to accept. Guards
 * can therefore fail to answer rather than answer no — `isTreemapNode` recurses
 * on `children` with no depth bound, so a deep enough payload arrives as a
 * RangeError. Tile.tsx wraps its own guard call for this reason and spends one
 * tile on it; up here an escaping throw leaves `ontoolresult`, so the widget
 * unmounts whole instead of showing its parse-error state.
 */
function accepts<P>(
  isPayload: (value: unknown) => value is P,
  value: unknown,
): value is P {
  try {
    return isPayload(value);
  } catch {
    return false;
  }
}

export function extractPayload<P>(
  result: { structuredContent?: unknown; content?: unknown },
  isPayload: (value: unknown) => value is P,
): P | null {
  if (accepts(isPayload, result.structuredContent)) {
    return result.structuredContent;
  }
  if (Array.isArray(result.content) && result.content.length > 0) {
    const first = result.content[0] as { type?: string; text?: string };
    if (first?.type === "text" && typeof first.text === "string") {
      // Scoped to JSON.parse alone: while this catch also covered the guard
      // call, the text branch survived a throwing guard only by accident, and
      // would have lost that the moment the parse moved or narrowed.
      let parsed: unknown;
      try {
        parsed = JSON.parse(first.text);
      } catch {
        return null;
      }
      if (accepts(isPayload, parsed)) return parsed;
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
      appInfo: { name, version: WIDGET_VERSION },
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
