---
id: verify-tool-auto-detects-an-eslint-gate
type: process
title: verify tool auto-detects an eslint gate this repo does not have
created: 2026-07-26
tags: verify, ci, eslint, gates
source: dev-main-branch-workflow
---

On the TypeScript stack the marvin verify tool guesses `npx eslint .` as a lint gate, but sigil has no ESLint config or dependency, so the run FAILs spuriously. Pass explicit gates matching the repo's declared commands instead: test = `npm test`, typecheck = `npm run typecheck`, build = `npm run build` (the same set recorded in spec host-bindings). Do not add ESLint just to satisfy the auto-detection.
