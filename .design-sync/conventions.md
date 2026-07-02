## How to build with Sigil

Sigil is a set of **data-driven chart widgets**. You compose a chart by passing
it one typed `payload` prop — not by styling it. Each widget renders its own
titled card (with a Copy CSV / Copy PNG toolbar), sizes itself to its container,
and themes from the design tokens automatically. There are 10 widgets:
`BarChartView`, `LineChartView`, `PieChartView`, `ScatterChartView`,
`HeatmapView`, `TableView`, `TreemapView`, `StatPanelView`, `DashboardView`,
`MapView`. Read each one's
`components/widgets/<Name>/<Name>.d.ts` for its exact `payload<Name>Props` shape
and `<Name>.prompt.md` for examples before using it.

### Setup / theming

Themes ship as **static CSS custom properties** in the `styles.css` `@import`
closure — link `styles.css` once and every widget is themed (light by default,
dark via `prefers-color-scheme`). **No provider is required.** A
`SigilThemeProvider` export also exists; wrapping with it re-injects the same
`--sigil-*` tokens at runtime, but it is optional — only reach for it if a page
strips the stylesheet.

### Styling idiom — pass data, theme with tokens

You do **not** style the widgets with classes or style props — give them data
via `payload` and they render themselves. The widgets' own internals use a fixed
class vocabulary (`.sigil-root`, `.sigil-header`, `.sigil-title`,
`.sigil-toolbar`, `.sigil-toolbar-btn`, `.sigil-canvas`, `.sigil-empty`) — treat
these as private; don't target or reproduce them.

For **your own** surrounding layout (the page or dashboard you place widgets
into), use the same `var(--sigil-*)` tokens so it matches the charts. The real
families (all defined on `:root` in `styles.css`):

| Group | Tokens |
|---|---|
| Series palette | `--sigil-series-0` … `--sigil-series-9` (per-datum chart colors) |
| Surfaces | `--sigil-bg`, `--sigil-surface`, `--sigil-surface-elevated`, `--sigil-surface-sunken` |
| Text | `--sigil-text`, `--sigil-text-secondary`, `--sigil-text-muted` |
| Borders | `--sigil-border-subtle`, `--sigil-border-default`, `--sigil-border-strong` |
| Spacing | `--sigil-space-{0,xs,sm,md,lg,xl,2xl}` |
| Radius | `--sigil-radius-{sm,md,lg,full}` |
| Type | `--sigil-font-sans`, `--sigil-font-mono`, and `--sigil-font-{title,label,tick,value,tooltip}-*` scales |
| Semantic | `--sigil-danger-{surface,border,text}`, `--sigil-focus-ring*` |

Per-datum colors are optional: omit `color` on a datum and the widget assigns
from the series palette in order. Fonts (IBM Plex Sans / Mono) load from Google
Fonts via an `@import` already in `styles.css`.

### Build snippet

```jsx
// window.Sigil.* after <link rel="stylesheet" href="styles.css"> + <script src="_ds_bundle.js">
const { BarChartView } = window.Sigil;

<div style={{ background: "var(--sigil-bg)", padding: "var(--sigil-space-lg)" }}>
  <BarChartView
    payload={{
      title: "Quarterly revenue",
      orientation: "vertical",
      ylabel: "USD",
      data: [
        { label: "Q1", value: 32000 },
        { label: "Q2", value: 41000 },
        { label: "Q3", value: 47000 },
        { label: "Q4", value: 52000 },
      ],
    }}
  />
</div>
```
