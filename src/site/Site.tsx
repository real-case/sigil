import { useEffect, useState, type ReactNode } from "react";
import { setForcedTheme } from "../widgets/shared/theme.js";
import { WIDGET_ENTRIES } from "../widgets/sandbox/datasets/index.js";
import { Playground } from "./Playground.js";

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
      // Private mode or blocked storage: the choice just won't persist.
    }
  }, [mode]);
  return [mode, setMode];
}

// ----- Small parts -----------------------------------------------------------

type CopyState = "idle" | "copied" | "failed";

function useCopy(): [CopyState, (text: string) => void] {
  const [state, setState] = useState<CopyState>("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);
  const copy = (text: string) => {
    if (!navigator.clipboard) {
      setState("failed");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => setState("copied"),
      () => setState("failed"),
    );
  };
  return [state, copy];
}

const COPY_LABEL: Record<CopyState, string> = {
  idle: "Copy",
  copied: "Copied",
  failed: "Select and copy",
};

function Logo() {
  // The mark is a tiny line chart in two series colours: the product, drawn.
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
        <button key={o.id} type="button" aria-pressed={mode === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}

function CopyCommand({ command }: { command: string }) {
  const [state, copy] = useCopy();
  return (
    <div className="copy-command">
      <code>
        <span className="prompt" aria-hidden="true">
          $
        </span>{" "}
        {command}
      </code>
      <button type="button" onClick={() => copy(command)} aria-label={`Copy command: ${command}`}>
        <span aria-live="polite">{COPY_LABEL[state]}</span>
      </button>
    </div>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [state, copy] = useCopy();
  return (
    <div className="code-block">
      <div className="code-block-bar">
        <span>{label}</span>
        <button type="button" onClick={() => copy(code)} aria-label={`Copy ${label}`}>
          <span aria-live="polite">{COPY_LABEL[state]}</span>
        </button>
      </div>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable code block must be keyboard-scrollable */}
      <pre tabIndex={0}>
        <code>{code}</code>
      </pre>
    </div>
  );
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
          <a href="#try">Try it</a>
          <a href="#live">Why live</a>
          <a href="#install">Install</a>
          <a href={`${REPO}#tool-reference`}>Tool reference</a>
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
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="container">
        <div className="hero-copy">
          <h1 id="hero-title">Charts that stay live in the conversation.</h1>
          <p className="lede">
            Sigil is an MCP Apps server with {WIDGET_ENTRIES.length} chart widgets. When Claude or Copilot answers
            with numbers, it calls a Sigil tool and the host draws a chart you can hover, sort, filter and copy as
            CSV or PNG, in the host's own light or dark theme.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#install">
              Add to Claude Desktop
            </a>
            <CopyCommand command={INSTALL_CMD} />
          </div>
          <p className="hero-meta">
            v{__SIGIL_VERSION__}, MIT licensed, Node 18 or newer. Works in Claude Desktop, Claude web and VS Code
            Copilot Chat.
          </p>
        </div>
      </div>

      <div className="stage" id="try">
        <div className="stage-inner">
          <h2 className="stage-title">Edit what the model sends. The chart redraws as you type.</h2>
          <Playground />
        </div>
      </div>
    </section>
  );
}

const LIVE: { term: string; body: string }[] = [
  {
    term: "Hover, click, mute",
    body: "Tooltips with exact values, a shared crosshair on line charts, click a bar or slice to focus it, click a legend entry to mute a series. Tables sort and filter.",
  },
  {
    term: "Copy CSV, copy PNG",
    body: "The chart can leave the chat: the data as CSV for a spreadsheet, the image as PNG for a slide. Tables and stat panels copy CSV.",
  },
  {
    term: "The host's theme and width",
    body: "Light and dark follow the host. Widgets reflow from a 320 px column to full width, and dashboard tiles size themselves.",
  },
  {
    term: "Keyboard and screen reader",
    body: "One tab stop per chart, arrow keys between marks, Enter does what a click does. Every chart is named from its title, type and size.",
  },
  {
    term: "Bad data fails readably",
    body: "The zod schema the model reads is the same one the widget checks. Wrong arguments get a message that names the field, and a broken dashboard tile costs one tile, not the grid.",
  },
  {
    term: "Nothing leaves the frame",
    body: "Each widget is one HTML file with its fonts and map atlases inlined. No CDN and no third-party request for a strict host CSP to block.",
  },
];

function Live() {
  return (
    <section className="section" id="live" aria-labelledby="live-title">
      <div className="container split">
        <div className="split-head">
          <h2 id="live-title">What a live chart gives you that a PNG can't</h2>
          <p>
            Static chart servers hand the assistant an image. Sigil hands the host a small app, so the answer stays
            something you can question.
          </p>
        </div>
        <dl className="facts">
          {LIVE.map((f) => (
            <div key={f.term}>
              <dt>{f.term}</dt>
              <dd>{f.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Flow() {
  return (
    <section className="section" aria-labelledby="flow-title">
      <div className="container">
        <h2 id="flow-title">How a chart gets into the conversation</h2>
        <ol className="flow">
          <li>
            <span className="flow-actor">Model</span>
            <p>Picks the tool that fits the question and fills its arguments from your data.</p>
            <code className="flow-msg">tools/call render_bar_chart</code>
          </li>
          <li>
            <span className="flow-actor">Sigil</span>
            <p>Validates the arguments against the tool's schema and returns them with a UI resource.</p>
            <code className="flow-msg">ui://sigil/bar-chart</code>
          </li>
          <li>
            <span className="flow-actor">Host</span>
            <p>Mounts the widget in a sandboxed iframe inside the reply and streams the result into it.</p>
            <code className="flow-msg">live chart in the reply</code>
          </li>
        </ol>
      </div>
    </section>
  );
}

function Spec() {
  const rows: { k: string; v: ReactNode }[] = [
    { k: "Widgets", v: WIDGET_ENTRIES.map((e) => e.label).join(", ") },
    { k: "Hosts", v: "Claude Desktop, Claude web (custom connector), VS Code Copilot Chat, any MCP Apps host" },
    { k: "Transports", v: "stdio through npx, Streamable HTTP for hosted deployments" },
    { k: "Validation", v: "One zod schema per tool, shared by the tool contract and the widget guard" },
    { k: "Bundle", v: "One self-contained HTML file per widget, no runtime network requests" },
    {
      k: "Package",
      v: (
        <>
          <a href={NPM}>@real-case/sigil</a> on npm, v{__SIGIL_VERSION__}, MIT, Node 18+
        </>
      ),
    },
  ];
  return (
    <section className="section" aria-labelledby="spec-title">
      <div className="container split">
        <div className="split-head">
          <h2 id="spec-title">Spec sheet</h2>
          <p>The short version, for deciding whether Sigil fits your setup.</p>
        </div>
        <table className="spec">
          <tbody>
            {rows.map((r) => (
              <tr key={r.k}>
                <th scope="row">{r.k}</th>
                <td>{r.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
        On macOS the file is in <code>~/Library/Application Support/Claude/</code>. Restart Claude Desktop and{" "}
        <code>sigil</code> appears in the tools list.
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
    note: <>Add it to the workspace. Copilot Chat picks up the tools on the next request.</>,
  },
  {
    id: "web",
    label: "Claude web",
    file: "terminal",
    code: `npm run dev                                          # starts on :3001
npx cloudflared tunnel --url http://localhost:3001   # gives an HTTPS URL`,
    note: (
      <>
        Needs a paid Claude plan. Run Sigil in HTTP mode somewhere reachable, then add the HTTPS URL ending in{" "}
        <code>/mcp</code> under Settings, Connectors, Add custom connector. The server has no authentication of
        its own, so put a proxy in front of any public deployment.
      </>
    ),
  },
];

function Install() {
  const [tab, setTab] = useState(INSTALL_TABS[0]?.id ?? "desktop");
  const current = INSTALL_TABS.find((t) => t.id === tab) ?? INSTALL_TABS[0];
  return (
    <section className="section" id="install" aria-labelledby="install-title">
      <div className="container split">
        <div className="split-head">
          <h2 id="install-title">Install</h2>
          <p>
            Sigil runs over stdio through <code>npx</code>, so desktop clients need no server of their own.
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
    <section className="section" aria-labelledby="ritual-title">
      <div className="container split">
        <div className="split-head">
          <h2 id="ritual-title">Optional: ritual mode</h2>
          <p>
            Paste the <a href={`${REPO}/blob/dev/INCANTATIONS.md`}>incantations preset</a> into your project
            instructions and the assistant answers to spells, with a few Might and Magic homages for genre fans.
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
          <a href="/llms.txt">llms.txt</a>
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
      <a className="skip-link" href="#try">
        Skip to the playground
      </a>
      <Header mode={mode} onTheme={setMode} />
      <main>
        <Hero />
        <Live />
        <Flow />
        <Install />
        <Spec />
        <Ritual />
      </main>
      <Footer />
    </>
  );
}
