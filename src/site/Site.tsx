import { useEffect, useMemo, useState, type ReactNode } from "react";
import { setForcedTheme } from "../widgets/shared/theme.js";
import { WIDGET_ENTRIES, type WidgetEntry, type WidgetKey } from "../widgets/sandbox/datasets/index.js";
import type { Dataset } from "../widgets/sandbox/datasets/types.js";
import { WIDGET_META } from "./widgets-meta.js";

declare const __SIGIL_VERSION__: string;

const REPO = "https://github.com/real-case/sigil";
const NPM = "https://www.npmjs.com/package/@real-case/sigil";
const INSTALL_CMD = "npx -y @real-case/sigil";

// ----- Theme -----------------------------------------------------------------

type ThemeMode = "system" | "light" | "dark";
// Mirrors the inline pre-paint script in index.html.
const THEME_KEY = "sigil-site-theme";

function readSavedTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(readSavedTheme);
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") {
      delete root.dataset["sigilTheme"];
      setForcedTheme(null);
    } else {
      root.dataset["sigilTheme"] = mode;
      setForcedTheme(mode);
    }
    try {
      if (mode === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch {
      // Private mode / blocked storage: the choice just won't persist.
    }
  }, [mode]);
  return [mode, setMode];
}

// ----- Helpers ---------------------------------------------------------------

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

function findEntry(key: WidgetKey): WidgetEntry {
  const entry = WIDGET_ENTRIES.find((e) => e.key === key);
  if (!entry) throw new Error(`Unknown widget ${key}`);
  return entry;
}

function findDataset(entry: WidgetEntry, id: string): Dataset<never> | undefined {
  return entry.datasets.find((d) => d.id === id);
}

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  return [
    copied,
    (text) => {
      navigator.clipboard?.writeText(text).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    },
  ];
}

// ----- Building blocks -------------------------------------------------------

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect width="32" height="32" rx="8" className="logo-bg" />
      <path
        d="M7 22 L12.5 14 L17 18.5 L25 9"
        fill="none"
        className="logo-line"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25" cy="9" r="2.4" className="logo-dot" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function ThemeSwitch({ mode, onChange }: { mode: ThemeMode; onChange: (m: ThemeMode) => void }) {
  const options: { id: ThemeMode; label: string }[] = [
    { id: "system", label: "Auto" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];
  return (
    <fieldset className="segmented" aria-label="Colour theme">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={mode === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}

function CopyCommand({ command }: { command: string }) {
  const [copied, copy] = useCopy();
  return (
    <div className="copy-command">
      <code>
        <span className="prompt" aria-hidden="true">
          $
        </span>{" "}
        {command}
      </code>
      <button type="button" onClick={() => copy(command)}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, copy] = useCopy();
  return (
    <div className="code-block">
      <div className="code-block-bar">
        <span>{label}</span>
        <button type="button" onClick={() => copy(code)}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** A conversation mock: the user's ask, the tool call, the live widget. */
function ChatFrame({
  prompt,
  tool,
  children,
}: {
  prompt: string;
  tool: string;
  children: ReactNode;
}) {
  return (
    <div className="chat-frame">
      <div className="chat-user">
        <p>{prompt}</p>
      </div>
      <div className="chat-tool">
        <span className="chat-tool-dot" aria-hidden="true" />
        Used <code>{tool}</code> from <strong>sigil</strong>
      </div>
      <div className="chat-widget">{children}</div>
    </div>
  );
}

function LiveWidget({ entry, dataset }: { entry: WidgetEntry; dataset: Dataset<never> }) {
  const View = entry.View;
  // Keyed by dataset so internal widget state (sorts, mutes, focus) resets.
  return <View key={dataset.id} payload={dataset.payload} />;
}

// ----- Sections --------------------------------------------------------------

function Header({ mode, onTheme }: { mode: ThemeMode; onTheme: (m: ThemeMode) => void }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="#top">
          <Logo />
          <span>Sigil</span>
        </a>
        <nav className="nav" aria-label="Primary">
          <a href="#widgets">Widgets</a>
          <a href="#how">How it works</a>
          <a href="#install">Install</a>
          <a href={`${REPO}#tool-reference`}>Docs</a>
        </nav>
        <div className="header-actions">
          <ThemeSwitch mode={mode} onChange={onTheme} />
          <a className="icon-link" href={REPO} aria-label="Sigil on GitHub">
            <GitHubIcon />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const entry = findEntry("dashboard");
  // The compact preset: the overview one is a full screen tall on its own.
  const dataset = findDataset(entry, "dashboard-minimal") ?? entry.datasets[0];
  return (
    <section className="hero" id="top">
      <div className="container">
        <div className="hero-copy">
          <p className="eyebrow">
            MCP Apps server · v{__SIGIL_VERSION__} · MIT
          </p>
          <h1>
            Charts that stay <em>alive</em> in the conversation.
          </h1>
          <p className="lede">
            Sigil gives Claude and other MCP Apps hosts {WIDGET_ENTRIES.length} interactive widgets. Instead of a flat
            PNG, the assistant hands you a chart you can hover, click, filter and copy — rendered
            inline, in your host's light or dark theme.
          </p>
          <div className="hero-actions">
            <CopyCommand command={INSTALL_CMD} />
            <a className="button primary" href="#install">
              Add to Claude
            </a>
            <a className="button" href="#widgets">
              Browse widgets
            </a>
          </div>
        </div>
        {dataset ? (
          <div className="hero-demo">
            <ChatFrame prompt="How did we do this week?" tool={WIDGET_META.dashboard.tool}>
              <LiveWidget entry={entry} dataset={dataset} />
            </ChatFrame>
            <p className="demo-note">This is the real widget, not a screenshot. Go ahead — hover it.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

const FEATURES: { title: string; body: string }[] = [
  {
    title: "Live, not a picture",
    body: "Hover tooltips, shared crosshairs, click-to-highlight, sortable tables and legends that mute a series. The data stays explorable after the answer is written.",
  },
  {
    title: "Copy CSV or PNG",
    body: "Every chart carries Copy CSV and Copy PNG, so a chart from a chat moves straight into a doc, a slide or a spreadsheet.",
  },
  {
    title: "Fits the host",
    body: "Light and dark themes follow the host. Widgets reflow from a 320 px phone column to a full-width canvas, and dashboard tiles size themselves.",
  },
  {
    title: "Accessible by default",
    body: "Clickable marks are keyboard-reachable — one tab stop per chart, arrow keys to move, Enter to act — and every chart has a name a screen reader can say.",
  },
  {
    title: "One schema per payload",
    body: "Each tool's input is a single zod schema. The model sees it as the tool contract; the widget uses the same schema to reject bad data with a readable error.",
  },
  {
    title: "Self-contained",
    body: "Each widget ships as one HTML file with fonts and map atlases inlined. No CDN, no third-party request, nothing for a strict host CSP to block.",
  },
];

function Features() {
  return (
    <section className="section" aria-labelledby="features-title">
      <div className="container">
        <h2 id="features-title" className="section-title">
          A chart is a conversation, too
        </h2>
        <ul className="feature-grid">
          {FEATURES.map((f) => (
            <li key={f.title} className="feature">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Gallery() {
  const [key, setKey] = useState<WidgetKey>("line-chart");
  const entry = useMemo(() => findEntry(key), [key]);
  const meta = WIDGET_META[key];
  const presets = useMemo(() => showcaseDatasets(entry), [entry]);
  const [datasetId, setDatasetId] = useState(meta.featured);
  const dataset = findDataset(entry, datasetId) ?? findDataset(entry, meta.featured) ?? presets[0];

  const pick = (k: WidgetKey) => {
    setKey(k);
    setDatasetId(WIDGET_META[k].featured);
  };

  return (
    <section className="section gallery" id="widgets" aria-labelledby="widgets-title">
      <div className="container">
        <h2 id="widgets-title" className="section-title">
          {WIDGET_ENTRIES.length} widgets, one per question
        </h2>
        <p className="section-lede">
          The assistant picks the tool that fits the question. Pick one here to see what it renders — every
          example below is the production widget running on sample data.
        </p>

        <div className="gallery-layout">
          <nav className="widget-list" aria-label="Widgets">
            {WIDGET_ENTRIES.map((e) => (
              <button
                key={e.key}
                type="button"
                aria-pressed={e.key === key}
                onClick={() => pick(e.key)}
              >
                <span className="widget-list-name">{e.label}</span>
                <code>{WIDGET_META[e.key].tool}</code>
              </button>
            ))}
          </nav>

          <div className="gallery-stage">
            <div className="gallery-meta">
              <div>
                <h3>
                  <code>{meta.tool}</code>
                </h3>
                <p>{meta.when}</p>
              </div>
              {presets.length > 1 ? (
                <label className="preset-picker">
                  <span>Example</span>
                  <select value={dataset?.id} onChange={(ev) => setDatasetId(ev.target.value)}>
                    {presets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {presetLabel(d.label)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {dataset ? (
              <>
                <ChatFrame prompt={meta.prompt} tool={meta.tool}>
                  <LiveWidget entry={entry} dataset={dataset} />
                </ChatFrame>
                <details className="payload">
                  <summary>Tool arguments the model sent</summary>
                  <pre>
                    <code>{JSON.stringify(dataset.payload, null, 2)}</code>
                  </pre>
                </details>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS: { title: string; body: string }[] = [
  {
    title: "The model calls a tool",
    body: "Sigil registers one render_* tool per widget. The assistant fills in the arguments from your data — titles, series, labels — validated against the tool's schema.",
  },
  {
    title: "Sigil returns a UI resource",
    body: "The tool result points at a ui:// resource: a single self-contained HTML widget, advertised through the MCP Apps extension.",
  },
  {
    title: "The host renders it inline",
    body: "Claude, VS Code Copilot or any MCP Apps host mounts the widget in a sandboxed iframe and streams the tool result into it. You get a chart you can work with.",
  },
];

const SAMPLE_CALL = `{
  "name": "render_bar_chart",
  "arguments": {
    "title": "Revenue by region",
    "orientation": "horizontal",
    "data": [
      { "label": "North America", "value": 4200 },
      { "label": "Europe",        "value": 3100 },
      { "label": "APAC",          "value": 2650 }
    ]
  }
}`;

function HowItWorks() {
  return (
    <section className="section alt" id="how" aria-labelledby="how-title">
      <div className="container how-layout">
        <div>
          <h2 id="how-title" className="section-title">
            How it works
          </h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <CodeBlock code={SAMPLE_CALL} label="tools/call" />
      </div>
    </section>
  );
}

const INSTALL_TABS: { id: string; label: string; file: string; code: string; note: ReactNode }[] = [
  {
    id: "desktop",
    label: "Claude Desktop",
    file: "claude_desktop_config.json",
    code: `{
  "mcpServers": {
    "sigil": {
      "command": "npx",
      "args": ["-y", "@real-case/sigil"]
    }
  }
}`,
    note: (
      <>
        On macOS the file lives in <code>~/Library/Application Support/Claude/</code>. Restart Claude
        Desktop and <code>sigil</code> appears in the tools list.
      </>
    ),
  },
  {
    id: "vscode",
    label: "VS Code Copilot",
    file: ".vscode/mcp.json",
    code: `{
  "servers": {
    "sigil": {
      "command": "npx",
      "args": ["-y", "@real-case/sigil"]
    }
  }
}`,
    note: <>Add it to your workspace and Copilot Chat picks up the tools on the next request.</>,
  },
  {
    id: "web",
    label: "Claude web",
    file: "terminal",
    code: `npm run dev                                          # starts on :3001
npx cloudflared tunnel --url http://localhost:3001   # gives an HTTPS URL`,
    note: (
      <>
        Run Sigil in HTTP mode somewhere reachable, then add the HTTPS URL ending in <code>/mcp</code>{" "}
        under Settings → Connectors → Add custom connector. The server has no authentication of its
        own, so put a proxy in front of any public deployment.
      </>
    ),
  },
];

function Install() {
  const [tab, setTab] = useState(INSTALL_TABS[0]?.id ?? "desktop");
  const current = INSTALL_TABS.find((t) => t.id === tab) ?? INSTALL_TABS[0];
  return (
    <section className="section" id="install" aria-labelledby="install-title">
      <div className="container install-layout">
        <div>
          <h2 id="install-title" className="section-title">
            Install in a minute
          </h2>
          <p className="section-lede">
            Sigil runs over stdio through <code>npx</code>, so there is nothing to host for desktop
            clients. Node 18 or newer is all it needs.
          </p>
          <fieldset className="segmented tabs" aria-label="Host">
            {INSTALL_TABS.map((t) => (
              <button key={t.id} type="button" aria-pressed={t.id === tab} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </fieldset>
          {current ? <p className="install-note">{current.note}</p> : null}
        </div>
        {current ? <CodeBlock key={current.id} code={current.code} label={current.file} /> : null}
      </div>
    </section>
  );
}

function Ritual() {
  return (
    <section className="section ritual" aria-labelledby="ritual-title">
      <div className="container ritual-inner">
        <div>
          <p className="eyebrow">Optional · ritual mode</p>
          <h2 id="ritual-title">Summon charts in ritual register</h2>
          <p>
            Drop the <a href={`${REPO}/blob/dev/INCANTATIONS.md`}>incantations preset</a> into your
            project instructions and the assistant answers to spells — with a few homages for genre fans.
          </p>
        </div>
        <ul className="spells">
          <li>Astrologers proclaim a week of Q1 sales: US 1200, EU 950, APAC 670.</li>
          <li>View Air on monthly temperatures for Berlin and Madrid.</li>
          <li>Animate Dead from revenue by region.</li>
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="brand">
          <Logo />
          <span>Sigil</span>
        </div>
        <p>A sigil carries compressed meaning in a glyph. Same idea, applied to data.</p>
        <nav aria-label="Footer">
          <a href={REPO}>GitHub</a>
          <a href={NPM}>npm</a>
          <a href={`${REPO}/blob/dev/LICENSE`}>MIT License</a>
        </nav>
      </div>
    </footer>
  );
}

export function Site() {
  const [mode, setMode] = useThemeMode();
  return (
    <>
      <a className="skip-link" href="#widgets">
        Skip to widgets
      </a>
      <Header mode={mode} onTheme={setMode} />
      <main>
        <Hero />
        <Features />
        <Gallery />
        <HowItWorks />
        <Install />
        <Ritual />
      </main>
      <Footer />
    </>
  );
}
