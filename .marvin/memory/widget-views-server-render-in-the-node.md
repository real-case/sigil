---
id: widget-views-server-render-in-the-node
type: gotcha
title: Widget views server-render in the node test env, but error boundaries do not
created: 2026-08-09
tags: testing, vitest, react, ssr, error-boundary, widgets
source: dashboard-tile-resilience
---

`renderToString(<SomeView payload={…} />)` works in this repo's existing `environment: "node"` vitest setup — the real `DashboardView` with bar, sankey and map tiles renders in ~7 ms with no jsdom and no Vite plugin, because `tsconfig`'s `jsx: "react-jsx"` already drives vitest's esbuild transform. Four traps around it: (1) `vitest.config.ts`'s include glob is `*.test.ts` only, so a `.tsx` test file is silently not collected and `npm test` stays green — widen the glob and prove it by filtering on the `.tsx` alone, since naming any `.ts` file alongside it makes vitest exit 0 regardless; (2) React 19.2.8 does **not** route a child's throw through `getDerivedStateFromError` under either `renderToString` or `renderToStaticMarkup` — the error escapes the renderer, so SSR cannot prove error-boundary containment at all; (3) `renderToString` HTML-escapes text children, so asserting copy containing quotes needs the `&quot;` form; (4) a plain function component can be called directly (`Tile({...})`) and its returned element tree inspected, which proves wiring without any renderer.

**Why:** the repo has no DOM test dependency and the single-file bundle constraint makes adding one a real decision, so knowing exactly how far the node env reaches saves reaching for jsdom by reflex — and knowing where it stops stops you writing a containment test that can never fail.

**How to apply:** reach for `renderToString` for anything about rendered output, structure or degradation. For anything about a boundary catching a throw, either test the class contract plus a wiring assertion, or adopt jsdom deliberately — vitest 4 takes a per-file `// @vitest-environment jsdom` docblock, so it costs one devDependency and no global config change.
