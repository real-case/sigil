# CLAUDE.md — Project Instructions for Sigil

This file provides repository-level guidance for Claude Code when working in this codebase. Read it before making changes.

## Project at a glance

Sigil is an MCP Apps server that ships interactive chart widgets (bar / line / pie / table) which render inline inside AI hosts (Claude Desktop, Claude web, VS Code Copilot, etc.). The full technical specification lives in [`SPEC.md`](./SPEC.md); the user-facing overview is in [`README.md`](./README.md).

Key entry points:

- `src/server.ts` — HTTP transport (Express + StreamableHTTPServerTransport)
- `src/stdio.ts` — stdio transport (for `npx sigil` in Claude Desktop / VS Code)
- `src/registry.ts` — single source of truth for the widget set (server tools, build pipeline, UI resources)
- `src/widgets/<name>/App.tsx` — per-widget React entry; bundled to a single-file HTML by Vite + `vite-plugin-singlefile`
- `src/widgets/shared/widget-shell.tsx` — `mountWidget` HOC that handles payload guarding, status, and `app.ontoolresult` plumbing for every widget

## Rules

### Documentation language

- **All Markdown (`.md`) files in this repository must be written in English** — including, but not limited to, `README.md`, `SPEC.md`, `TESTING.md`, `CLAUDE.md`, and anything under `specs/`.
- This rule applies to prose, headings, code-block comments, table contents, and inline examples.
- The rule also covers **`.mdx` Storybook documentation** under `src/stories/` — they are documentation in the same spirit and must be written in English.
- **Exception:** a Markdown file may contain non-English content only when it is *feature data* — i.e. text that exists because the product itself recognises or emits it. The exception must be declared explicitly in a note at the top of that file, naming this rule and the reason.
- Current sanctioned exception: [`INCANTATIONS.md`](./INCANTATIONS.md), which documents Russian-language ritual trigger phrases as part of Sigil's optional ritual-mode preset.
- Untranslated Markdown checked in without an explicit exception note should be flagged and translated.

### Other conventions

- Don't propose bundle-size optimisations unprompted — per-widget Recharts inlining is intentional for this package (see `memory/feedback_bundle_size.md`).
- When adding a new widget, only create new files; the registry pattern means no enumeration list needs editing.

## Useful commands

```bash
npm run dev          # HTTP server on :3001 (Claude web via cloudflared)
npm run dev:stdio    # stdio server (Claude Desktop / VS Code)
npm run dev:sandbox  # in-browser sandbox: pick any widget + preset dataset, toggle theme/viewport/debug overlay (src/widgets/sandbox)
npm run dev:storybook    # Storybook 10 widget catalog on :6006 (autodocs + dataset-driven stories, theme/viewport toolbars)
npm run typecheck    # tsc --noEmit
npm run build        # bundle widgets + compile server
npm run build:storybook  # static catalog to storybook-static/ (gitignored)
```
