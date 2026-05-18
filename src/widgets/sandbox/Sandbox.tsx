import { useEffect, useMemo, useState } from "react";
import { setForcedTheme, type ThemeName } from "../shared/theme.js";
import { WIDGET_ENTRIES, type WidgetKey } from "./datasets/index.js";

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
              <View payload={dataset.payload} />
            ) : (
              <div className="sandbox-empty">No dataset selected.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
