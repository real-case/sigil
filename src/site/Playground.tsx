import { Component, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { WIDGET_ENTRIES, type WidgetEntry, type WidgetKey } from "../widgets/sandbox/datasets/index.js";
import type { Dataset } from "../widgets/sandbox/datasets/types.js";
import { checkArguments, type CheckResult } from "./validate.js";
import { WIDGET_META } from "./widgets-meta.js";

// The sandbox presets double as a regression suite; only the ones that read
// as real-world examples belong on a product page.
const HIDDEN_CATEGORIES = new Set(["minimal", "edgeLabels", "degraded"]);

function showcaseDatasets(entry: WidgetEntry): Dataset<never>[] {
  const shown = entry.datasets.filter((d) => !HIDDEN_CATEGORIES.has(d.category));
  return shown.length > 0 ? shown : entry.datasets;
}

function presetLabel(label: string): string {
  const i = label.indexOf("—");
  return i >= 0 ? label.slice(i + 1).trim() : label;
}

function entryFor(key: WidgetKey): WidgetEntry {
  const entry = WIDGET_ENTRIES.find((e) => e.key === key);
  if (!entry) throw new Error(`Unknown widget ${key}`);
  return entry;
}

function exampleFor(entry: WidgetEntry, id: string): Dataset<never> | undefined {
  return entry.datasets.find((d) => d.id === id) ?? showcaseDatasets(entry)[0];
}

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

/** Catches a widget that throws on arguments its guard let through. */
class RenderBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  override state = { error: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  override render() {
    if (this.state.error) {
      return (
        <p className="pg-render-error">
          The widget accepted these arguments but failed while drawing them: {this.state.error}. Edit the
          arguments or reset to the example.
        </p>
      );
    }
    return this.props.children;
  }
}

const DEBOUNCE_MS = 300;

export function Playground() {
  const [key, setKey] = useState<WidgetKey>("bar-chart");
  const entry = useMemo(() => entryFor(key), [key]);
  const meta = WIDGET_META[key];
  const examples = useMemo(() => showcaseDatasets(entry), [entry]);

  const [exampleId, setExampleId] = useState(meta.featured);
  const example = exampleFor(entry, exampleId);
  const exampleText = useMemo(() => (example ? pretty(example.payload) : ""), [example]);

  const [text, setText] = useState(exampleText);
  const [result, setResult] = useState<CheckResult>({ ok: true, payload: example?.payload });
  // The last arguments that rendered: kept on screen, marked stale, while the
  // visitor's edit is invalid — so a typo never blanks the chart.
  const [lastGood, setLastGoodRaw] = useState<unknown>(example?.payload);
  // Bumped with every new good payload, to reset a tripped RenderBoundary.
  const [goodRev, setGoodRev] = useState(0);
  const setLastGood = (v: unknown) => {
    setLastGoodRaw(v);
    setGoodRev((n) => n + 1);
  };

  // Text already known to be valid (a freshly loaded example) skips the check,
  // so loading an example doesn't redraw the chart a second time.
  const checked = useRef(text);

  const load = (k: WidgetKey, id: string) => {
    const e = entryFor(k);
    const ex = exampleFor(e, id);
    checked.current = ex ? pretty(ex.payload) : "";
    setKey(k);
    setExampleId(ex?.id ?? id);
    setText(ex ? pretty(ex.payload) : "");
    setResult({ ok: true, payload: ex?.payload });
    setLastGood(ex?.payload);
  };

  useEffect(() => {
    if (text === checked.current) return;
    const t = setTimeout(() => {
      checked.current = text;
      const r = checkArguments(key, text);
      setResult(r);
      if (r.ok) setLastGood(r.payload);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [key, text]);

  const edited = text !== exampleText;
  const View = entry.View;
  const editorId = useId();
  const statusId = useId();

  return (
    <div className="pg">
      <div className="pg-controls">
        <fieldset className="pg-widgets" aria-label="Widget">
          {WIDGET_ENTRIES.map((e) => (
            <button
              key={e.key}
              type="button"
              aria-pressed={e.key === key}
              onClick={() => load(e.key, WIDGET_META[e.key].featured)}
            >
              {e.label}
            </button>
          ))}
        </fieldset>
      </div>

      <div className="pg-panes">
        <section className="pg-host" aria-label="How the host shows it">
          <div className="pg-host-bar">
            <span>Conversation</span>
            <span className="pg-host-tool">
              <code>{meta.tool}</code>
            </span>
          </div>
          <div className="pg-host-body">
            <p className="pg-ask">{meta.prompt}</p>
            {!result.ok && lastGood !== undefined ? (
              <p className="pg-stale">Showing the last arguments that passed. Fix the edit to update the chart.</p>
            ) : null}
            <div className="pg-widget" data-stale={!result.ok}>
              {lastGood !== undefined ? (
                <RenderBoundary key={goodRev}>
                  <View payload={lastGood as never} />
                </RenderBoundary>
              ) : (
                <p className="pg-render-error">Nothing to draw yet: the arguments have not passed validation.</p>
              )}
            </div>
          </div>
        </section>

        <section className="pg-editor" aria-label="Tool arguments">
          <div className="pg-editor-bar">
            <label htmlFor={editorId}>
              Arguments the model sends to <code>{meta.tool}</code>
            </label>
          </div>
          <div className="pg-editor-tools">
            {examples.length > 1 ? (
              <label className="pg-example">
                <span>Example</span>
                <select value={exampleId} onChange={(ev) => load(key, ev.target.value)}>
                  {examples.map((d) => (
                    <option key={d.id} value={d.id}>
                      {presetLabel(d.label)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span />
            )}
            <button type="button" className="pg-reset" disabled={!edited} onClick={() => load(key, exampleId)}>
              Reset example
            </button>
          </div>
          <textarea
            id={editorId}
            className="pg-textarea"
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-describedby={statusId}
            aria-invalid={!result.ok}
          />
          <div id={statusId} className="pg-status" data-ok={result.ok} aria-live="polite">
            {result.ok ? (
              <p>
                {edited ? "Valid. The chart reflects your edit." : "Edit any value. The chart redraws as you type."}
              </p>
            ) : (
              <>
                <p>
                  {result.kind === "json"
                    ? "Couldn't read the arguments as JSON."
                    : result.kind === "empty"
                      ? "There is nothing to render."
                      : `${meta.tool} would reject these arguments.`}
                </p>
                <ul>
                  {result.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>
      <p className="pg-when">
        <strong>{entry.label}.</strong> {meta.when}
      </p>
    </div>
  );
}
