import { useEffect, useMemo, useState } from "react";
import { setForcedTheme, type ThemeName } from "../shared/theme.js";
import { createFollowUp, FollowUpProvider, type FollowUpHost } from "../shared/follow-up.js";
import { WIDGET_ENTRIES, type WidgetKey } from "./datasets/index.js";

interface HostLogEntry {
  kind: "message" | "context";
  text: string;
}

/**
 * A stand-in host that declares `message` and `updateModelContext` and records
 * what the widget sends, so drill-down can be tried without Claude. The 600 ms
 * delay keeps a message "in flight" long enough to see that a second pick is
 * dropped.
 */
function fakeHost(log: (entry: HostLogEntry) => void): FollowUpHost {
  return {
    getHostCapabilities: () => ({ message: {}, updateModelContext: {} }),
    sendMessage: async ({ content }) => {
      log({ kind: "message", text: content.map((c) => c.text).join("\n") });
      await new Promise((r) => setTimeout(r, 600));
      return {};
    },
    updateModelContext: async ({ content }) => {
      log({ kind: "context", text: content.map((c) => c.text).join("\n") });
      return {};
    },
  };
}

const VIEWPORT_PRESETS = [
  { id: "320", label: "320 — mobile", width: 320 },
  { id: "480", label: "480 — large phone", width: 480 },
  { id: "768", label: "768 — tablet", width: 768 },
  { id: "1024", label: "1024 — desktop", width: 1024 },
  { id: "fluid", label: "fluid", width: null as number | null },
] as const;

type ViewportId = (typeof VIEWPORT_PRESETS)[number]["id"];

export function Sandbox() {
  const [widgetKey, setWidgetKey] = useState<WidgetKey>(WIDGET_ENTRIES[0]!.key);
  const entry = useMemo(
    () => WIDGET_ENTRIES.find((e) => e.key === widgetKey) ?? WIDGET_ENTRIES[0]!,
    [widgetKey],
  );

  const [datasetId, setDatasetId] = useState<string>(entry.datasets[0]?.id ?? "");
  const dataset = useMemo(
    () => entry.datasets.find((d) => d.id === datasetId) ?? entry.datasets[0],
    [entry, datasetId],
  );

  // Keep dataset selection valid when widget changes.
  useEffect(() => {
    if (!entry.datasets.find((d) => d.id === datasetId)) {
      setDatasetId(entry.datasets[0]?.id ?? "");
    }
  }, [entry, datasetId]);

  const [theme, setTheme] = useState<ThemeName>("light");
  useEffect(() => {
    setForcedTheme(theme);
    if (typeof document !== "undefined") {
      document.documentElement.dataset["sigilTheme"] = theme;
    }
    return () => {
      setForcedTheme(null);
      if (typeof document !== "undefined") {
        delete document.documentElement.dataset["sigilTheme"];
      }
    };
  }, [theme]);

  const [viewport, setViewport] = useState<ViewportId>("fluid");
  const viewportWidth = VIEWPORT_PRESETS.find((v) => v.id === viewport)?.width ?? null;

  const [debug, setDebug] = useState(false);

  // Drill-down: off behaves like a host without `message` (no menu at all).
  const [hostMessage, setHostMessage] = useState(false);
  const [hostLog, setHostLog] = useState<HostLogEntry[]>([]);
  const followUp = useMemo(
    () =>
      hostMessage
        ? createFollowUp(fakeHost((entry) => setHostLog((prev) => [entry, ...prev].slice(0, 8))))
        : null,
    [hostMessage],
  );

  const View = entry.View;

  return (
    <div className="sandbox-shell">
      <header className="sandbox-toolbar">
        <div className="group">
          <span className="label">Widget</span>
          <select
            value={widgetKey}
            onChange={(e) => setWidgetKey(e.target.value as WidgetKey)}
          >
            {WIDGET_ENTRIES.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        <div className="group">
          <span className="label">Dataset</span>
          <select value={datasetId} onChange={(e) => setDatasetId(e.target.value)}>
            {entry.datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} · {d.category}
              </option>
            ))}
          </select>
        </div>

        <div className="group">
          <span className="label">Theme</span>
          <div className="pills">
            <button
              type="button"
              data-active={theme === "light"}
              onClick={() => setTheme("light")}
            >
              Light
            </button>
            <button
              type="button"
              data-active={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              Dark
            </button>
          </div>
        </div>

        <div className="group">
          <span className="label">Viewport</span>
          <div className="pills">
            {VIEWPORT_PRESETS.map((v) => (
              <button
                key={v.id}
                type="button"
                data-active={viewport === v.id}
                onClick={() => setViewport(v.id)}
                title={v.label}
              >
                {v.id}
              </button>
            ))}
          </div>
        </div>

        <div className="group">
          <span className="label">Debug</span>
          <button
            type="button"
            data-active={debug}
            onClick={() => setDebug((v) => !v)}
            title="Toggle bounding-box overlay"
          >
            {debug ? "on" : "off"}
          </button>
        </div>

        <div className="group">
          <span className="label">Host message</span>
          <button
            type="button"
            data-active={hostMessage}
            onClick={() => setHostMessage((v) => !v)}
            title="Pretend the host declares hostCapabilities.message (drill-down menu on marks)"
          >
            {hostMessage ? "on" : "off"}
          </button>
        </div>
      </header>

      <div className="sandbox-stage-wrap">
        <div
          className="sandbox-stage"
          style={{
            width: viewportWidth ?? "100%",
            maxWidth: viewportWidth ?? "1280px",
          }}
        >
          <div className="sandbox-stage-meta">
            {entry.key} · {dataset?.id ?? "—"} · {dataset?.category ?? "—"}
            {viewportWidth ? ` · ${viewportWidth}px` : " · fluid"}
            {" · "}
            {theme}
          </div>
          <div className="sandbox-stage-frame" data-debug={debug}>
            {dataset ? (
              <FollowUpProvider value={followUp}>
                <View payload={dataset.payload} />
              </FollowUpProvider>
            ) : (
              <div className="sandbox-empty">No dataset selected.</div>
            )}
          </div>
          {hostMessage && (
            <ol className="sandbox-host-log" aria-label="Messages sent to the host">
              {hostLog.length === 0 ? (
                <li>Click a mark to open its drill-down menu.</li>
              ) : (
                hostLog.map((e, i) => (
                  <li key={i} data-kind={e.kind}>
                    <b>{e.kind === "message" ? "sendMessage" : "updateModelContext"}</b> {e.text}
                  </li>
                ))
              )}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
